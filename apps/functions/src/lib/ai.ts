import { logger } from '@educonnect/logger';
import { AiGenerationConfig } from './ai-providers/base.provider.js';
import { OfflineAiProvider } from './ai-providers/offline.provider.js';

const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
const geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

type AiProviderPreference = 'auto' | 'openrouter' | 'gemini' | 'offline';

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

/**
 * Prioritized list of approved free OpenRouter models for startup/demo mode.
 * Keep this list conservative: only free models should be accepted by OPENROUTER_MODEL.
 */
export const FREE_MODEL_PRIORITY = [
  'google/gemma-3-4b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
];

export const FREE_OPENROUTER_MODELS = new Set([...FREE_MODEL_PRIORITY, 'openrouter/auto']);

const DEFAULT_FREE_MODEL = FREE_MODEL_PRIORITY[0];
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

function getProviderPreference(): AiProviderPreference {
  const configured = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  if (configured === 'openrouter' || configured === 'gemini' || configured === 'offline') {
    return configured;
  }
  return 'auto';
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function getHttpReferer(): string {
  return (
    process.env.PUBLIC_APP_URL || process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173'
  );
}

function sanitizeFreeModel(model?: string): string {
  if (!model) return DEFAULT_FREE_MODEL;
  return FREE_OPENROUTER_MODELS.has(model) ? model : DEFAULT_FREE_MODEL;
}

function shouldTryOpenRouterFirst() {
  const preference = getProviderPreference();
  return preference === 'auto' || preference === 'openrouter';
}

function shouldTryGeminiFirst() {
  return getProviderPreference() === 'gemini';
}

export function isAiEnabled() {
  if (getProviderPreference() === 'offline') return false;
  return Boolean(getOpenRouterApiKey() || getGeminiApiKey());
}

export function getOpenRouterModel() {
  return sanitizeFreeModel(process.env.OPENROUTER_MODEL);
}

export function getAiRuntimeStatus() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const hasGeminiKey = Boolean(getGeminiApiKey());
  const configuredProvider = getProviderPreference();
  const openRouterModel = getOpenRouterModel();
  const geminiModel = getGeminiModel();

  const activeProvider =
    configuredProvider === 'offline'
      ? 'offline'
      : configuredProvider === 'gemini' && hasGeminiKey
        ? 'gemini'
        : configuredProvider === 'openrouter' && hasOpenRouterKey
          ? 'openrouter'
          : hasOpenRouterKey
            ? 'openrouter'
            : hasGeminiKey
              ? 'gemini'
              : 'offline';

  return {
    enabled: activeProvider !== 'offline',
    configuredProvider,
    provider: activeProvider,
    model:
      activeProvider === 'openrouter'
        ? openRouterModel
        : activeProvider === 'gemini'
          ? geminiModel
          : 'offline',
    fallbackProvider:
      activeProvider === 'openrouter' && hasGeminiKey
        ? 'gemini'
        : activeProvider === 'gemini' && hasOpenRouterKey
          ? 'openrouter'
          : 'offline',
    mode: activeProvider !== 'offline' ? 'live' : 'offline-fallback',
    hasOpenRouterKey,
    hasGeminiKey,
    openRouterModel,
    geminiModel,
    freeModelEnforced: true,
    allowedFreeModels: Array.from(FREE_OPENROUTER_MODELS),
    runtime: process.env.VERCEL_URL ? 'vercel' : 'local',
    checkedAt: new Date().toISOString(),
  };
}

async function callGeminiModel(
  systemInstruction: string,
  userPrompt: string,
  config: AiGenerationConfig = {}
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key missing');
  }

  const model = getGeminiModel();
  const response = await fetch(`${geminiBaseUrl}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: config.maxOutputTokens || 900,
        temperature: config.temperature ?? 0.35,
        topP: config.topP ?? 0.9,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();
}

async function callOpenRouterFreeModel(
  model: string,
  systemInstruction: string,
  userPrompt: string,
  config: AiGenerationConfig = {}
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key missing');
  }

  const response = await fetch(openRouterUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': getHttpReferer(),
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

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const payload = (await response.json()) as OpenRouterChatResponse;
  return payload?.choices?.[0]?.message?.content || '';
}

async function tryGeminiFallback(
  systemInstruction: string,
  userPrompt: string,
  config: AiGenerationConfig = {}
): Promise<string | null> {
  if (!getGeminiApiKey()) return null;

  try {
    const response = await callGeminiModel(systemInstruction, userPrompt, config);
    return response.trim() ? response : null;
  } catch (error) {
    logger.error({ err: error }, '[AI] Gemini fallback failed');
    return null;
  }
}

async function tryOpenRouterFreeModels(
  systemInstruction: string,
  userPrompt: string,
  config: AiGenerationConfig = {},
  maxAttempts = FREE_MODEL_PRIORITY.length
): Promise<string | null> {
  if (!getOpenRouterApiKey()) return null;

  const requestedModel = getOpenRouterModel();
  const orderedModels = [
    requestedModel,
    ...FREE_MODEL_PRIORITY.filter((model) => model !== requestedModel),
  ].slice(0, Math.max(1, maxAttempts));

  for (const model of orderedModels) {
    try {
      const response = await callOpenRouterFreeModel(model, systemInstruction, userPrompt, {
        ...config,
        model,
      });

      if (response.trim()) {
        return response;
      }
    } catch (error) {
      logger.error({ err: error, model }, '[AI] Free model failed');
    }
  }

  return null;
}

/**
 * Safe AI content generation.
 * Startup mode is free-first:
 * - AI_PROVIDER=auto or openrouter: try approved free OpenRouter models first, then Gemini fallback.
 * - AI_PROVIDER=gemini: try Gemini first, then approved free OpenRouter fallback.
 * - AI_PROVIDER=offline or no keys: use deterministic offline fallback.
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: AiGenerationConfig = {},
  maxAttempts = FREE_MODEL_PRIORITY.length
): Promise<string> {
  const normalizedPrompt = userPrompt.toLowerCase();
  const premiumKeywords = ['gpt-4', 'gpt4', 'claude-3', 'claude 3', 'gemini pro', 'premium model'];

  if (premiumKeywords.some((keyword) => normalizedPrompt.includes(keyword))) {
    return 'Only free models are enabled. Only approved low-cost/free models are available on this platform.';
  }

  if (getProviderPreference() === 'offline') {
    const offlineProvider = new OfflineAiProvider();
    return await offlineProvider.generateContent(systemInstruction, userPrompt, config);
  }

  let attemptedLiveProvider = false;

  if (shouldTryGeminiFirst()) {
    attemptedLiveProvider ||= Boolean(getGeminiApiKey());
    const geminiResponse = await tryGeminiFallback(systemInstruction, userPrompt, config);
    if (geminiResponse) return geminiResponse;

    attemptedLiveProvider ||= Boolean(getOpenRouterApiKey());
    const openRouterResponse = await tryOpenRouterFreeModels(
      systemInstruction,
      userPrompt,
      config,
      maxAttempts
    );
    if (openRouterResponse) return openRouterResponse;
  }

  if (shouldTryOpenRouterFirst()) {
    attemptedLiveProvider ||= Boolean(getOpenRouterApiKey());
    const openRouterResponse = await tryOpenRouterFreeModels(
      systemInstruction,
      userPrompt,
      config,
      maxAttempts
    );
    if (openRouterResponse) return openRouterResponse;

    attemptedLiveProvider ||= Boolean(getGeminiApiKey());
    const geminiResponse = await tryGeminiFallback(systemInstruction, userPrompt, config);
    if (geminiResponse) return geminiResponse;
  }

  if (attemptedLiveProvider) {
    return 'AI providers are temporarily overloaded. Please try again shortly.';
  }

  const offlineProvider = new OfflineAiProvider();
  return await offlineProvider.generateContent(systemInstruction, userPrompt, config);
}
