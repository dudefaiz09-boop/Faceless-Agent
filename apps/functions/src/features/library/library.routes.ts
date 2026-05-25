import { Router, type Request, type Response, type NextFunction } from 'express';
import { LibraryController } from './library.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  uploadLibraryResourceSchema,
  borrowResourceSchema,
  returnResourceSchema,
  resourceIdParamsSchema,
  borrowHistoryParamsSchema,
  updateLibraryResourceSchema,
} from './library.validation.js';

function requireLibraryManager(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (user.isAdmin || user.permissions?.manageLibrary || user.roles?.includes('librarian'))
    return next();
  return res
    .status(403)
    .json({ error: 'Forbidden', message: 'Library manager or librarian access is required.' });
}

const router: Router = Router();

router.get(
  '/borrow/history/:uid',
  validate(borrowHistoryParamsSchema),
  LibraryController.getBorrowHistory
);
router.get('/resources', LibraryController.listResources);
router.get('/books', LibraryController.listBooks);
router.post(
  '/upload',
  requireLibraryManager,
  validate(uploadLibraryResourceSchema),
  LibraryController.upload
);
router.post('/borrow', validate(borrowResourceSchema), LibraryController.borrow);
router.post('/return', validate(returnResourceSchema), LibraryController.return);
router.put(
  '/resources/:id',
  requireLibraryManager,
  validate(updateLibraryResourceSchema),
  LibraryController.updateResource
);
router.delete(
  '/resources/:id',
  requireLibraryManager,
  validate(resourceIdParamsSchema),
  LibraryController.archiveResource
);

export default router;
