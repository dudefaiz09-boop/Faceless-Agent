import { AiGenerationConfig, AiProvider } from './base.provider.js';

export class OfflineAiProvider implements AiProvider {
  name = 'offline';

  isEnabled(): boolean {
    return true;
  }

  async generateContent(
    systemInstruction: string,
    userPrompt: string,
    _config?: AiGenerationConfig
  ): Promise<string> {
    const trimmed = userPrompt.trim().replace(/\s+/g, ' ').slice(0, 100);
    return [
      'AI is currently running in offline-safe mode.',
      '',
      trimmed ? `Practical starting point for "${trimmed}":` : 'Ask a focused question to start:',
      '- Identify your specific goal.',
      '- Break the task into 3 small steps.',
      '- Ask an admin to check the AI configuration if live AI is required.',
    ].join('\n');
  }
}
