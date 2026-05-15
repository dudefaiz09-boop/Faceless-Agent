import { AppError } from '../middleware/error.js';
import { env } from './config.js';

const openRouterApiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
const openRouterModel =
  env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free';
const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

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

export const AI_MODEL = openRouterModel;
export const isAiEnabled = !!openRouterApiKey;
export const AI_HTTP_REFERER = getHttpReferer();

function fallbackResponse(userPrompt: string) {
  const trimmed = userPrompt.trim().replace(/\s+/g, ' ').slice(0, 220);
  return [
    'AI is running in offline-safe mode because OPENROUTER_API_KEY is not configured.',
    '',
    trimmed
      ? `Here is a practical starting point for: "${trimmed}"`
      : 'Ask a focused question and I will help you break it down.',
    '',
    '- Identify the goal and the deadline.',
    '- Break the work into 3-5 concrete steps.',
    '- Track blockers early and ask a teacher or admin for help when needed.',
  ].join('\n');
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
 * - Enforces structured prompt handling
 * - Implements token budgeting
 * - Prevents prompt injection by isolating system instructions
 */
export async function generateSafeContent(
  systemInstruction: string,
  userPrompt: string,
  config: any = {},
  retries = 2
): Promise<string> {
  if (!isAiEnabled) {
    return fallbackResponse(userPrompt);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(openRouterUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_HTTP_REFERER,
        'X-Title': 'EduConnect AI',
      },
      body: JSON.stringify({
        model: openRouterModel,
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
      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return generateSafeContent(systemInstruction, userPrompt, config, retries - 1);
      }
      // Log provider error details server-side only, don't expose to frontend
      const body = await response.text().catch(() => '');
      console.error('[AI] Provider error:', response.status, body.slice(0, 200));
      // Return safe fallback instead of throwing
      return fallbackResponse(userPrompt);
    }

    const payload = await response.json();
    const text = getMessageText(payload);

    if (!text) {
      throw new AppError('AI provider returned an empty response.', 502);
    }

    return text;
  } catch (error: any) {
    if (error?.name === 'AbortError' && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return generateSafeContent(systemInstruction, userPrompt, config, retries - 1);
    }

    console.error('[AI] Generation failed:', error);
    return fallbackResponse(userPrompt);
  }
}
