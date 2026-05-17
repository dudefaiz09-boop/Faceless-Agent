import { env } from './config.js';

const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Strict free-model allowlist.
 * Ensures the app only uses approved OpenRouter free models.
 */
/**
 * Prioritized list of approved free OpenRouter models for fallback.
 */
export const FREE_MODEL_PRIORITY = [
  'google/gemma-3-4b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
];

export const FREE_OPENROUTER_MODELS = new Set([...FREE_MODEL_PRIORITY, 'openrouter/auto']);

const DEFAULT_FREE_MODEL = FREE_MODEL_PRIORITY[0];

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || '';
}

/**
 * Safe helper to retrieve the OpenRouter model.
 * Enforces use of free models from the allowlist.
 */
export function getOpenRouterModel() {
  const configuredModel =
    process.env.OPENROUTER_MODEL || env.OPENROUTER_MODEL || DEFAULT_FREE_MODEL;

  if (!FREE_OPENROUTER_MODELS.has(configuredModel)) {
    console.warn('[AI] Blocked non-free OpenRouter model. Falling back to default.', {
      configuredModel,
      fallback: DEFAULT_FREE_MODEL,
    });
    return DEFAULT_FREE_MODEL;
  }

  return configuredModel;
}

// Determine HTTP-Referer for OpenRouter
function getHttpReferer(): string {
  const publicUrl = env.PUBLIC_APP_URL || process.env.PUBLIC_APP_URL;
  if (publicUrl) return publicUrl;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  return 'http://localhost:5173';
}

export function isAiEnabled() {
  return !!getOpenRouterApiKey();
}

export function getAiRuntimeStatus() {
  const hasOpenRouterKey = !!getOpenRouterApiKey();
  const model = getOpenRouterModel();

  const keySource = process.env.OPENROUTER_API_KEY
    ? 'process.env'
    : env.OPENROUTER_API_KEY
      ? 'env'
      : 'missing';

  return {
    enabled: hasOpenRouterKey,
    provider: 'openrouter',
    model,
    mode: hasOpenRouterKey ? 'live' : 'offline-fallback',
    hasOpenRouterKey,
    keySource,
    freeModelEnforced: true,
    allowedFreeModels: Array.from(FREE_OPENROUTER_MODELS),
    runtime: process.env.VERCEL_URL ? 'vercel' : 'local',
    checkedAt: new Date().toISOString(),
  };
}

export const AI_HTTP_REFERER = getHttpReferer();

function getTrimmedPrompt(userPrompt: string) {
  return userPrompt.trim().replace(/\s+/g, ' ').slice(0, 220);
}

function missingKeyFallback(userPrompt: string) {
  const trimmed = getTrimmedPrompt(userPrompt);
  return [
    'AI is currently running in offline-safe mode because the API AI provider key is not configured.',
    '',
    trimmed ? `Practical starting point for "${trimmed}":` : 'Ask a focused question to start:',
    '- Identify your specific goal.',
    '- Break the task into 3 small steps.',
    '- Ask an admin to check the AI configuration if live AI is required.',
  ].join('\n');
}

function providerErrorFallback() {
  return 'AI provider is currently unavailable. Please retry later or ask an admin to check the API provider logs.';
}

function timeoutFallback() {
  return 'AI provider request timed out. Please retry later.';
}

function emptyResponseFallback() {
  return 'AI provider returned an empty response. Please retry later.';
}

function getMessageText(payload: any) {
  const message = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(message)) {
    return message
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
      .trim();
  }
  return typeof message === 'string' ? message.trim() : '';
}

/**
 * Safe AI Wrapper
 * - Enforces strict free-model usage with automatic fallback.
 * - Blocks premium model requests.
 * - Implements retries across different models.
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: any = {},
  retries = 2,
  modelIndex = -1
): Promise<string> {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return missingKeyFallback(userPrompt);
  }

  // Premium model detection
  const normalizedPrompt = userPrompt.toLowerCase();
  const premiumKeywords = ['gpt-4', 'gpt4', 'claude-3', 'claude 3', 'gemini pro', 'premium model'];
  if (premiumKeywords.some((k) => normalizedPrompt.includes(k))) {
    return 'Only free models are enabled on this platform. Please use your own API key for premium access.';
  }

  // Determine model: if retrying, move to next model in priority list
  let model: string;
  if (modelIndex === -1) {
    model = getOpenRouterModel();
    // find index of configured model to know where to start fallbacks
    modelIndex = FREE_MODEL_PRIORITY.indexOf(model);
    if (modelIndex === -1) modelIndex = 0; // fallback default
  } else {
    model = FREE_MODEL_PRIORITY[modelIndex] || DEFAULT_FREE_MODEL;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(openRouterUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_HTTP_REFERER,
        'X-Title': 'EduConnect AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: config.maxOutputTokens || 900,
        temperature: config.temperature ?? 0.35,
        top_p: config.topP ?? 0.9,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[AI] OpenRouter provider failure', {
        status: response.status,
        model,
        retriesRemaining: retries,
        body: body.slice(0, 200),
      });

      // Retry with NEXT model if possible, otherwise same model if retries allow
      if (retries > 0) {
        const nextModelIndex = (modelIndex + 1) % FREE_MODEL_PRIORITY.length;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return generateSafeContent(
          systemInstruction,
          userPrompt,
          config,
          retries - 1,
          nextModelIndex
        );
      }

      return 'EduConnect AI is temporarily overloaded. Please try again in a few moments.';
    }

    const payload = await response.json();
    const text = getMessageText(payload);

    if (!text) {
      console.warn('[AI] OpenRouter empty response', { model });
      if (retries > 0) {
        return generateSafeContent(systemInstruction, userPrompt, config, retries - 1, (modelIndex + 1) % FREE_MODEL_PRIORITY.length);
      }
      return emptyResponseFallback();
    }

    return text;
  } catch (error: any) {
    console.error('[AI] Generation failed:', { model, message: error?.message });

    if (retries > 0) {
      const nextModelIndex = (modelIndex + 1) % FREE_MODEL_PRIORITY.length;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return generateSafeContent(systemInstruction, userPrompt, config, retries - 1, nextModelIndex);
    }

    if (error?.name === 'AbortError') return timeoutFallback();
    return providerErrorFallback();
  }
}
