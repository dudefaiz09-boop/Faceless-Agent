import { AiGenerationConfig } from './ai-providers/base.provider.js';
import { OfflineAiProvider } from './ai-providers/offline.provider.js';

const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

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

function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

function getHttpReferer(): string {
  return process.env.PUBLIC_APP_URL || 'http://localhost:5173';
}

function sanitizeFreeModel(model?: string): string {
  if (!model) return DEFAULT_FREE_MODEL;
  return FREE_OPENROUTER_MODELS.has(model) ? model : DEFAULT_FREE_MODEL;
}

export function isAiEnabled() {
  return Boolean(getOpenRouterApiKey());
}

export function getOpenRouterModel() {
  return sanitizeFreeModel(process.env.OPENROUTER_MODEL);
}

export function getAiRuntimeStatus() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const model = getOpenRouterModel();

  return {
    enabled: hasOpenRouterKey,
    provider: 'openrouter',
    model,
    mode: hasOpenRouterKey ? 'live' : 'offline-fallback',
    hasOpenRouterKey,
    freeModelEnforced: true,
    allowedFreeModels: Array.from(FREE_OPENROUTER_MODELS),
    runtime: process.env.VERCEL_URL ? 'vercel' : 'local',
    checkedAt: new Date().toISOString(),
  };
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

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || '';
}

/**
 * Safe AI content generation.
 * Enforces free OpenRouter models and falls back across the free priority list.
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
    return 'Only free models are enabled on this platform. Please use your own API key for premium access.';
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    const offlineProvider = new OfflineAiProvider();
    return await offlineProvider.generateContent(systemInstruction, userPrompt, config);
  }

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
      console.error(`[AI] Free model ${model} failed:`, error);
    }
  }

  return 'The AI service is temporarily overloaded. Please try again shortly.';
}
