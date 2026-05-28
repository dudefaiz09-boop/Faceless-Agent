import { Router } from 'express';
import { DocumentsController } from './documents.controller.js';

const router = Router();

// Wrap async handlers properly for Express error handling
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/presign-upload', asyncHandler(DocumentsController.presignUpload));
router.post('/complete-upload', asyncHandler(DocumentsController.completeUpload));
router.get('/:id/download-url', asyncHandler(DocumentsController.getDownloadUrl));
router.delete('/:id', asyncHandler(DocumentsController.deleteDocument));

export default router;
