import { Request, Response, NextFunction } from 'express';
import { AiService } from './ai.service.js';
import { isAiEnabled, AI_MODEL } from '../../lib/ai.js';

export class AiController {
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        enabled: isAiEnabled,
        provider: 'openrouter',
        model: AI_MODEL,
        mode: isAiEnabled ? 'live' : 'offline-fallback',
      });
    } catch (error) {
      next(error);
    }
  }

  static async queryChatbot(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, mode } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id, response } = await AiService.getChatbotResponse(
        user.uid,
        user.role || user.roles[0] || 'student',
        query,
        mode
      );

      res.json({ success: true, id, response, timestamp: new Date().toISOString() });
    } catch (error) {
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
