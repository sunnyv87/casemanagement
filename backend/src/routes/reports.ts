import { Router, Request, Response, NextFunction } from 'express';
import db from '../database/connection';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/v1/reports/monthly/:customerId
router.get('/monthly/:customerId', authorize('customer', 'manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { month, year } = req.query;

    const reportMonth = parseInt(month as string) || new Date().getMonth() + 1;
    const reportYear = parseInt(year as string) || new Date().getFullYear();

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

    const customer = await db('customers').where('id', customerId).first();
    if (!customer) throw new AppError('Customer not found', 404);

    // Tenant check for customers
    if (req.user!.role === 'customer' && !req.user!.customerIds.includes(customerId)) {
      throw new AppError('Access denied', 403);
    }

    // Alert summary
    const alertSummary = await db('alerts')
      .where('customer_id', customerId)
      .whereBetween('ingested_at', [startDate, endDate])
      .select(
        db.raw('count(*) as total_alerts'),
        db.raw("count(*) filter (where severity = 'critical') as critical"),
        db.raw("count(*) filter (where severity = 'high') as high"),
        db.raw("count(*) filter (where severity = 'medium') as medium"),
        db.raw("count(*) filter (where severity = 'low') as low")
      )
      .first();

    // Alert by platform
    const alertByPlatform = await db('alerts')
      .where('customer_id', customerId)
      .whereBetween('ingested_at', [startDate, endDate])
      .select('source_platform', db.raw('count(*) as count'))
      .groupBy('source_platform');

    // Case summary
    const caseSummary = await db('cases')
      .where('customer_id', customerId)
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw('count(*) as total_cases'),
        db.raw("count(*) filter (where status in ('resolved', 'closed')) as resolved"),
        db.raw("count(*) filter (where case_type = 'false_positive') as false_positives")
      )
      .first();

    // SLA performance
    const slaPerformance = await db('cases')
      .where('customer_id', customerId)
      .whereBetween('created_at', [startDate, endDate])
      .whereIn('status', ['resolved', 'closed'])
      .select(
        db.raw('count(*) as total'),
        db.raw('count(*) filter (where sla_response_breached = false) as response_met'),
        db.raw('count(*) filter (where sla_resolution_breached = false) as resolution_met')
      )
      .first();

    // MTTR
    const mttr = await db('cases')
      .where('customer_id', customerId)
      .whereBetween('resolved_at', [startDate, endDate])
      .whereNotNull('resolved_at')
      .select(db.raw("avg(extract(epoch from (resolved_at - created_at))/3600) as avg_hours"))
      .first();

    // Top threat categories
    const topThreats = await db('alerts')
      .where('customer_id', customerId)
      .whereBetween('ingested_at', [startDate, endDate])
      .whereNotNull('alert_category')
      .select('alert_category', db.raw('count(*) as count'))
      .groupBy('alert_category')
      .orderBy('count', 'desc')
      .limit(10);

    res.json({
      report_period: { month: reportMonth, year: reportYear, start: startDate, end: endDate },
      customer: { name: customer.name, code: customer.code },
      alert_summary: alertSummary,
      alerts_by_platform: alertByPlatform,
      case_summary: caseSummary,
      sla_performance: slaPerformance,
      mttr_hours: parseFloat((mttr as any)?.avg_hours || '0').toFixed(2),
      top_threat_categories: topThreats,
    });
  } catch (err) { next(err); }
});

export { router as reportRouter };
