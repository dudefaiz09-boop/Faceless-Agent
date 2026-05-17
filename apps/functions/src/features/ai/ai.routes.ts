import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { validate } from '../../middleware/validate.js';
import { chatbotQuerySchema, aiSuggestionSchema } from './ai.validation.js';

const router: Router = Router();

router.get('/status', AiController.getStatus);
router.post('/query', validate(chatbotQuerySchema), AiController.queryChatbot);
router.post('/context-query', validate(chatbotQuerySchema), AiController.contextQueryChatbot);
router.post('/suggestions', validate(aiSuggestionSchema), AiController.getPerformanceTips);
router.get('/history/:userId', AiController.getHistory);
router.post('/feedback', AiController.saveFeedback);

export default router;
