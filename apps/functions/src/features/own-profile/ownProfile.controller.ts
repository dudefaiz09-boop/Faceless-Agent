import { Request, Response, NextFunction } from 'express';
import { OwnProfileRepository } from './ownProfile.repository.js';

export class OwnProfileController {
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const uid = req.user!.uid;
      const { displayName, photoURL } = req.body;
      const profile = await OwnProfileRepository.updateProfile(
        uid,
        req.user!.email,
        displayName,
        photoURL
      );
      res.json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  }
}
