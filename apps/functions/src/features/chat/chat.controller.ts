import { Request, Response, NextFunction } from 'express';
import { ChatRepository } from './chat.repository.js';

export class ChatController {
  static async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const rooms = await ChatRepository.listRooms(req.user!, req.tenantId!);
      res.json(rooms);
    } catch (error) {
      next(error);
    }
  }

  static async listContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const contacts = await ChatRepository.listContacts(req.user!, req.tenantId!);
      res.json(contacts);
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await ChatRepository.getMessages(req.params.id, req.user!, req.tenantId!);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  static async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await ChatRepository.createConversation(
        req.body,
        req.user!,
        req.tenantId!
      );
      res.status(conversation.createdAt === conversation.updatedAt ? 201 : 200).json(conversation);
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await ChatRepository.sendMessage(req.body, req.user!, req.tenantId!);
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ChatRepository.markRead(req.params.id, req.user!, req.tenantId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
