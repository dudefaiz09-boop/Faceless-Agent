import { GoogleGenAI } from '@google/genai';
import { AppError } from '../middleware/error.js';
import { env } from './config.js';

/**
 * Enterprise AI Configuration
 * Migrated to Vertex AI for Google Cloud billing, SLA, and ADC authentication.
 * Removes hardcoded API keys in favor of IAM Service Accounts.
 */
export const ai = new GoogleGenAI({
  vertexai: true,
  project: env.PROJECT_ID,
  location: env.VERTEX_LOCATION,
});

// Using Vertex AI models
export const GEMINI_MODEL = 'gemini-2.5-flash';

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
  try {
    const options: any = {
      model: GEMINI_MODEL,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.2, // Lowered for more deterministic output
        topP: 0.9,
        systemInstruction: systemInstruction,
        ...config,
      },
    };

    const result = await ai.models.generateContent({
      ...options,
      contents: [{ role: 'user', parts: [{ text: `User Query (Unsafe): ${userPrompt}` }] }],
    });

    return result.text || '';
  } catch (error: any) {
    // Quota and backoff handling
    if (error.status === 429 && retries > 0) {
      console.warn(`[AI] Rate limit hit. Retrying in 2s... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return generateSafeContent(systemInstruction, userPrompt, config, retries - 1);
    }

    console.error('[AI] Generation failed:', error);
    throw new AppError('Failed to generate AI content due to a system error.', 500);
  }
}
