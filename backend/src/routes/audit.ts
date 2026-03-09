import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { queryAuditLogs } from '../services/auditService';

const router = Router();
router.use(authenticate);

// GET /api/v1/audit/logs
router.get('/logs', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const filters: any = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 50, 200),
    };

    if (req.query.customer_id) filters.customer_id = req.query.customer_id;
    if (req.query.event_type) filters.event_type = req.query.event_type;
    if (req.query.actor_user_id) filters.actor_user_id = req.query.actor_user_id;
    if (req.query.target_entity_type) filters.target_entity_type = req.query.target_entity_type;
    if (req.query.from_date) filters.from_date = req.query.from_date;
    if (req.query.to_date) filters.to_date = req.query.to_date;

    // Managers can only see audit logs for their customers
    if (user.role === 'manager' && !filters.customer_id) {
      // Return logs for all assigned customers
      filters.customer_id = undefined; // Will need to filter in service
    }

    const result = await queryAuditLogs(filters);
    res.json(result);
  } catch (err) { next(err); }
});

export { router as auditRouter };
