import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  getOpenRouterModel,
  FREE_OPENROUTER_MODELS,
  getAiRuntimeStatus,
} from '../apps/functions/src/lib/ai.js';

describe('AI Model Enforcement', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns the configured free model', () => {
    const freeModel = 'google/gemma-3-12b-it:free';
    process.env.OPENROUTER_MODEL = freeModel;
    expect(getOpenRouterModel()).toBe(freeModel);
  });

  it('blocks paid OpenAI models and falls back to default free model', () => {
    process.env.OPENROUTER_MODEL = 'openai/gpt-4o';
    const result = getOpenRouterModel();
    expect(result).toBe('google/gemma-3-4b-it:free');
    expect(FREE_OPENROUTER_MODELS.has(result)).toBe(true);
  });

  it('blocks paid Anthropic models and falls back to default free model', () => {
    process.env.OPENROUTER_MODEL = 'anthropic/claude-3-opus';
    const result = getOpenRouterModel();
    expect(result).toBe('google/gemma-3-4b-it:free');
    expect(FREE_OPENROUTER_MODELS.has(result)).toBe(true);
  });

  it('falls back to default model when no model is configured', () => {
    delete process.env.OPENROUTER_MODEL;
    expect(getOpenRouterModel()).toBe('google/gemma-3-4b-it:free');
  });

  it('allows openrouter/auto model', () => {
    process.env.OPENROUTER_MODEL = 'openrouter/auto';
    expect(getOpenRouterModel()).toBe('openrouter/auto');
  });

  describe('getAiRuntimeStatus', () => {
    it('includes safety diagnostics and does not expose API key', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-123';
      process.env.OPENROUTER_MODEL = 'google/gemma-3-4b-it:free';

      const status = getAiRuntimeStatus();

      expect(status).toMatchObject({
        enabled: true,
        provider: 'openrouter',
        model: 'google/gemma-3-4b-it:free',
        freeModelEnforced: true,
      });

      expect(status.allowedFreeModels).toEqual(
        expect.arrayContaining(['google/gemma-3-4b-it:free'])
      );

      // Ensure API key is NOT in the status object
      const statusString = JSON.stringify(status);
      expect(statusString).not.toContain('sk-or-test-key-123');
      expect(Object.values(status)).not.toContain('sk-or-test-key-123');
    });

    it('reports offline-fallback mode when key is missing', () => {
      delete process.env.OPENROUTER_API_KEY;
      const status = getAiRuntimeStatus();
      expect(status.mode).toBe('offline-fallback');
      expect(status.enabled).toBe(false);
    });
  });
});
