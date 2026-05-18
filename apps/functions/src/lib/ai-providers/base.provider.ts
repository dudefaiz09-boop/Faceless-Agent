export interface AiGenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  model?: string;
}

export interface AiProvider {
  name: string;
  generateContent(
    systemInstruction: string,
    userPrompt: string,
    config?: AiGenerationConfig
  ): Promise<string>;
  isEnabled(): boolean;
}
