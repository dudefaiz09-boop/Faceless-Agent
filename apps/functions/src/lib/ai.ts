import { env } from './config.js';

const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || '';
}

function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL || env.OPENROUTER_MODEL || 'google/gemma-3-4b-it:free';
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

function getMessageText(payload: unknown) {
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
 * - Enforces structured prompt handling
 * - Implements token budgeting
 * - Prevents prompt injection by isolating system instructions
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: Record<string, unknown> = {},
  retries = 2
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const model = getOpenRouterModel();

  if (!apiKey) {
    return missingKeyFallback(userPrompt);
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
      // Log provider error details server-side only, don't expose to frontend
      const body = await response.text().catch(() => '');
      console.error('[AI] OpenRouter provider error', {
        status: response.status,
        model,
        body: body.slice(0, 500),
      });

      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return generateSafeContent(systemInstruction, userPrompt, config, retries - 1);
      }

      return providerErrorFallback();
    }

    const payload = await response.json();
    const text = getMessageText(payload);

    if (!text) {
      console.warn('[AI] OpenRouter empty response', { model });
      return emptyResponseFallback();
    }

    return text;
  } catch (error: unknown) {
    if (error?.name === 'AbortError') {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return generateSafeContent(systemInstruction, userPrompt, config, retries - 1);
      }
      console.error('[AI] OpenRouter timeout');
      return timeoutFallback();
    }

    console.error('[AI] Generation failed:', {
      name: error?.name,
      message: error?.message,
    });
    return providerErrorFallback();
  }
}
