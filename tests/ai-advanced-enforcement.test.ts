import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { generateSafeContent, FREE_MODEL_PRIORITY } from '../apps/functions/src/lib/ai.js';
import { AiService } from '../apps/functions/src/features/ai/ai.service.js';

const mockFetch = jest.fn() as any;
global.fetch = mockFetch;

describe('Advanced AI Safety & Fallback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects premium model requests with zero-cost message', async () => {
    const result = await generateSafeContent('sys', 'Can you use GPT-4?');
    expect(result).toContain('Only free models are enabled');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('automatically falls back to next free model on provider error', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' })
      .mockResolvedValueOnce({ ok: false, status: 502, text: async () => 'Error' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Llama response' } }],
        }),
      });

    const result = await generateSafeContent('sys', 'Hello');

    expect(result).toBe('Llama response');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).model).toBe(FREE_MODEL_PRIORITY[0]);
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).model).toBe(FREE_MODEL_PRIORITY[1]);
    expect(JSON.parse(mockFetch.mock.calls[2][1].body).model).toBe(FREE_MODEL_PRIORITY[2]);
  });

  it('returns overload message when all free models fail', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'Overload' });

    const result = await generateSafeContent('sys', 'Hello', {}, 2);
    expect(result).toContain('temporarily overloaded');
  });

  it('caches repeated queries for the same user/role', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Fresh response' } }],
      }),
    });

    const userId = 'user123';
    const role = 'student';
    const query = 'How do I check attendance?';

    const res1 = await AiService.getChatbotResponse(userId, role, query);
    expect(res1.response).toBe('Fresh response');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const res2 = await AiService.getChatbotResponse(userId, role, query);
    expect(res2.response).toBe('Fresh response');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((res2 as { cached?: boolean }).cached).toBe(true);
  });
});
