import { AiProvider, AiGenerationConfig } from './base.provider.js';
import { getConfig } from '../config.js';

const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL_PRIORITY = [
  'google/gemma-3-4b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
];

export class OpenRouterAiProvider implements AiProvider {
  name = 'openrouter';

  private getApiKey() {
    return process.env.OPENROUTER_API_KEY || getConfig().OPENROUTER_API_KEY || '';
  }

  private getModel() {
    return process.env.OPENROUTER_MODEL || getConfig().OPENROUTER_MODEL || FREE_MODEL_PRIORITY[0];
  }

  private getHttpReferer(): string {
    const publicUrl = getConfig().PUBLIC_APP_URL || process.env.PUBLIC_APP_URL;
    if (publicUrl) return publicUrl;
    return 'http://localhost:5173';
  }

  isEnabled(): boolean {
    return !!this.getApiKey();
  }

  async generateContent(
    systemInstruction: string,
    userPrompt: string,
    config: AiGenerationConfig = {}
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OpenRouter API key missing');

    const model = config.model || this.getModel();

    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.getHttpReferer(),
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
}
