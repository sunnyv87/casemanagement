import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';

const router = Router();
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await getUserNotifications(req.user!.id, unreadOnly, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await markNotificationRead(req.params.id, req.user!.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) { next(err); }
});

// POST /api/v1/notifications/read-all
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await markAllNotificationsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

export { router as notificationRouter };
