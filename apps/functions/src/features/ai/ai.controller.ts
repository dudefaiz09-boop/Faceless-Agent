import { Request, Response, NextFunction } from 'express';
import { AiService } from './ai.service.js';
import { AiContextService } from './ai-context.service.js';
import { getAiRuntimeStatus } from '../../lib/ai.js';

export class AiController {
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(getAiRuntimeStatus());
    } catch (error) {
      next(error);
    }
  }

  static async publicQueryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, mode } = req.body || {};
      const tenantId = req.tenantId || (req.headers['x-school-id'] as string | undefined);
      const fallbackRole = typeof req.headers['x-user-role'] === 'string' ? req.headers['x-user-role'] : 'student';

      if (!tenantId) {
        console.warn('[AI] Missing tenant header (x-school-id) for public query');
        return res.status(400).json({
          error: 'Tenant Context Required',
          message: 'x-school-id header is required for AI chat.',
        });
      }

      if (typeof query !== 'string' || query.trim().length === 0 || query.length > 2000) {
        console.warn('[AI] Validation failure:', { queryLength: query?.length, mode });
        return res.status(400).json({
          error: 'Invalid AI query',
          message: 'query must be a non-empty string under 2000 characters.',
        });
      }

      const { id, response } = await AiService.getChatbotResponse(
        `tenant:${tenantId}:ai-user`,
        fallbackRole,
        query.trim(),
        mode
      );

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 502 || err.message?.includes('AI provider')) {
        return res.status(502).json({
          error: 'AI_PROVIDER_ERROR',
          message: 'AI provider request failed',
          details: err.message,
        });
      }
      next(error);
    }
  }

  static async queryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, mode } = req.body;
      const user = req.user;
      const tenantId = req.tenantId || (req.headers['x-school-id'] as string | undefined);

      // The AI assistant does not read private school records in this route; it only answers the
      // submitted prompt. During Supabase migration, some valid sessions may not resolve to req.user
      // even though the tenant header is present. Allow a tenant-scoped fallback user so the assistant
      // remains usable instead of surfacing a misleading OpenRouter key error.
      if (!user && !tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const fallbackRole = typeof req.headers['x-user-role'] === 'string' ? req.headers['x-user-role'] : 'student';
      const userId = user?.uid || `tenant:${tenantId}:ai-user`;
      const role = user?.role || user?.roles?.[0] || fallbackRole || 'student';

      const { id, response } = await AiService.getChatbotResponse(userId, role, query, mode);

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 502 || err.message?.includes('AI provider')) {
        return res.status(502).json({
          error: 'AI_PROVIDER_ERROR',
          message: 'AI provider request failed',
          details: err.message,
        });
      }
      next(error);
    }
  }

  static async contextQueryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, mode, modules: requestedModules } = req.body;
      const user = req.user;
      const tenantId = req.tenantId || (req.headers['x-school-id'] as string | undefined);

      if (!user && !tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const fallbackRole = typeof req.headers['x-user-role'] === 'string' ? req.headers['x-user-role'] : 'student';
      const userId = user?.uid || `tenant:${tenantId}:ai-user`;
      const role = user?.role || user?.roles?.[0] || fallbackRole || 'student';
      const tid = tenantId || user?.tenantId || '';

      const inferred = AiContextService.inferModulesFromQuery(query);
      const finalModules = Array.from(new Set([...inferred, ...(requestedModules || [])]));

      const context = await AiContextService.getModuleContext(userId, role, tid, finalModules as string[]);
      const { id, response } = await AiService.getChatbotResponse(userId, role, query, mode, context);

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 502 || err.message?.includes('AI provider')) {
        return res.status(502).json({
          error: 'AI_PROVIDER_ERROR',
          message: 'AI provider request failed',
          details: err.message,
        });
      }
      next(error);
    }
  }

  static async getPerformanceTips(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, records } = req.body;
      const tips = await AiService.getPerformanceSuggestions(studentId, records);
      res.json({ success: true, tips });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const history = await AiService.getHistory(userId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  static async saveFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { logId, feedback } = req.body;
      await AiService.saveFeedback(logId, feedback);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
