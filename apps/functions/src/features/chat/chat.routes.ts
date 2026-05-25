import { Router } from 'express';
import { ChatController } from './chat.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  chatRoomParamsSchema,
  createConversationSchema,
  sendMessageSchema,
} from './chat.validation.js';

const router: Router = Router();

router.get('/rooms', ChatController.listRooms);
router.get('/contacts', ChatController.listContacts);
router.get('/rooms/:id/messages', validate(chatRoomParamsSchema), ChatController.getMessages);
router.post(
  '/conversations',
  validate(createConversationSchema),
  ChatController.createConversation
);
router.post('/send', validate(sendMessageSchema), ChatController.sendMessage);
router.patch('/rooms/:id/read', validate(chatRoomParamsSchema), ChatController.markRead);

export default router;
