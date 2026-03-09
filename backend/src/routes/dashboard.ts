import { Router, Request, Response, NextFunction } from 'express';
import db from '../database/connection';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/v1/dashboard/analyst - Analyst workbench
router.get('/analyst', authorize('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const customerFilter = user.role === 'analyst' ? user.customerIds : undefined;

    // My assigned cases
    let myCasesQuery = db('cases').where('assigned_analyst_id', user.id).whereNotIn('status', ['closed']);
    const myCases = await myCasesQuery.select(
      db.raw('count(*) as total'),
      db.raw("count(*) filter (where severity = 'critical') as critical"),
      db.raw("count(*) filter (where severity = 'high') as high"),
      db.raw("count(*) filter (where sla_response_breached = true or sla_resolution_breached = true) as sla_breached")
    ).first();

    // My assigned alerts
    let myAlertsQuery = db('alerts').where('assigned_to', user.id).where('alert_status', 'new');
    const newAlerts = await myAlertsQuery.count('* as count').first();

    // Unassigned alerts for my customers
    let unassignedQuery = db('alerts').whereNull('assigned_to').where('alert_status', 'new');
    if (customerFilter) unassignedQuery = unassignedQuery.whereIn('customer_id', customerFilter);
    const unassignedAlerts = await unassignedQuery.count('* as count').first();

    // Recent cases
    let recentQuery = db('cases')
      .where('assigned_analyst_id', user.id)
      .whereNotIn('status', ['closed'])
      .leftJoin('customers', 'cases.customer_id', 'customers.id')
      .select('cases.case_id', 'cases.case_number', 'cases.title', 'cases.severity', 'cases.priority', 'cases.status', 'cases.sla_response_due_at', 'cases.sla_resolution_due_at', 'cases.sla_response_breached', 'cases.sla_resolution_breached', 'customers.name as customer_name')
      .orderBy('cases.created_at', 'desc')
      .limit(10);
    const recentCases = await recentQuery;

    res.json({
      my_cases: myCases,
      new_alerts: parseInt((newAlerts as any)?.count || '0'),
      unassigned_alerts: parseInt((unassignedAlerts as any)?.count || '0'),
      recent_cases: recentCases,
    });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/manager - Manager overview
router.get('/manager', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const customerFilter = user.role === 'manager' ? user.customerIds : undefined;

    // Cases by status
    let casesByStatusQuery = db('cases').select('status', db.raw('count(*) as count')).groupBy('status');
    if (customerFilter) casesByStatusQuery = casesByStatusQuery.whereIn('customer_id', customerFilter);
    const casesByStatus = await casesByStatusQuery;

    // Cases by severity
    let casesBySeverityQuery = db('cases').whereNotIn('status', ['resolved', 'closed']).select('severity', db.raw('count(*) as count')).groupBy('severity');
    if (customerFilter) casesBySeverityQuery = casesBySeverityQuery.whereIn('customer_id', customerFilter);
    const casesBySeverity = await casesBySeverityQuery;

    // SLA compliance
    let totalCasesQuery = db('cases').whereIn('status', ['resolved', 'closed']);
    if (customerFilter) totalCasesQuery = totalCasesQuery.whereIn('customer_id', customerFilter);
    const totalResolved = await totalCasesQuery.count('* as count').first();
    const slaBreached = await totalCasesQuery.clone().where(function () {
      this.where('sla_response_breached', true).orWhere('sla_resolution_breached', true);
    }).count('* as count').first();

    const totalCount = parseInt((totalResolved as any)?.count || '0');
    const breachedCount = parseInt((slaBreached as any)?.count || '0');
    const slaCompliance = totalCount > 0 ? Math.round(((totalCount - breachedCount) / totalCount) * 100) : 100;

    // Alert volume by day (last 30 days)
    let alertTrendQuery = db('alerts')
      .select(db.raw("date_trunc('day', ingested_at) as date"), db.raw('count(*) as count'))
      .where('ingested_at', '>=', db.raw("now() - interval '30 days'"))
      .groupByRaw("date_trunc('day', ingested_at)")
      .orderBy('date', 'asc');
    if (customerFilter) alertTrendQuery = alertTrendQuery.whereIn('customer_id', customerFilter);
    const alertTrend = await alertTrendQuery;

    // Analyst workload
    let analystWorkloadQuery = db('cases')
      .whereNotIn('status', ['resolved', 'closed'])
      .whereNotNull('assigned_analyst_id')
      .join('users', 'cases.assigned_analyst_id', 'users.id')
      .select('users.id', 'users.first_name', 'users.last_name', db.raw('count(*) as open_cases'))
      .groupBy('users.id', 'users.first_name', 'users.last_name');
    if (customerFilter) analystWorkloadQuery = analystWorkloadQuery.whereIn('cases.customer_id', customerFilter);
    const analystWorkload = await analystWorkloadQuery;

    // MTTR (avg resolution time in hours for last 30 days)
    let mttrQuery = db('cases')
      .whereIn('status', ['resolved', 'closed'])
      .whereNotNull('resolved_at')
      .where('resolved_at', '>=', db.raw("now() - interval '30 days'"))
      .select(db.raw("avg(extract(epoch from (resolved_at - created_at))/3600) as avg_hours"));
    if (customerFilter) mttrQuery = mttrQuery.whereIn('customer_id', customerFilter);
    const mttr = await mttrQuery.first();

    // Per-customer summary
    let customerSummaryQuery = db('cases')
      .join('customers', 'cases.customer_id', 'customers.id')
      .select(
        'customers.id as customer_id',
        'customers.name as customer_name',
        db.raw('count(*) as total_cases'),
        db.raw("count(*) filter (where cases.status not in ('resolved', 'closed')) as open_cases"),
        db.raw("count(*) filter (where cases.sla_resolution_breached = true) as sla_breaches")
      )
      .groupBy('customers.id', 'customers.name');
    if (customerFilter) customerSummaryQuery = customerSummaryQuery.whereIn('cases.customer_id', customerFilter);
    const customerSummary = await customerSummaryQuery;

    res.json({
      cases_by_status: casesByStatus,
      cases_by_severity: casesBySeverity,
      sla_compliance: slaCompliance,
      alert_trend: alertTrend,
      analyst_workload: analystWorkload,
      mttr_hours: parseFloat((mttr as any)?.avg_hours || '0').toFixed(2),
      customer_summary: customerSummary,
    });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/admin - Admin console
router.get('/admin', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalCustomers = await db('customers').count('* as count').first();
    const activeCustomers = await db('customers').where('status', 'active').count('* as count').first();
    const totalUsers = await db('users').count('* as count').first();
    const activeIntegrations = await db('integrations').where('status', 'active').count('* as count').first();
    const errorIntegrations = await db('integrations').where('status', 'error').count('* as count').first();

    const platformStats = {
      total_customers: parseInt((totalCustomers as any)?.count || '0'),
      active_customers: parseInt((activeCustomers as any)?.count || '0'),
      total_users: parseInt((totalUsers as any)?.count || '0'),
      active_integrations: parseInt((activeIntegrations as any)?.count || '0'),
      error_integrations: parseInt((errorIntegrations as any)?.count || '0'),
    };

    // Recent audit events
    const recentAudit = await db('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .select('*');

    // Integration health
    const integrations = await db('integrations')
      .join('customers', 'integrations.customer_id', 'customers.id')
      .select('integrations.*', 'customers.name as customer_name');

    res.json({ platform_stats: platformStats, recent_audit: recentAudit, integrations });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/customer - Customer portal
router.get('/customer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.customerIds.length === 0) throw new AppError('No customer association', 403);

    const customerId = req.query.customer_id as string || user.customerIds[0];

    const caseStats = await db('cases').where('customer_id', customerId).select(
      db.raw('count(*) as total_cases'),
      db.raw("count(*) filter (where status not in ('resolved', 'closed')) as open_cases"),
      db.raw("count(*) filter (where status = 'resolved' or status = 'closed') as resolved_cases"),
      db.raw("count(*) filter (where severity = 'critical' and status not in ('resolved', 'closed')) as critical_open")
    ).first();

    const recentCases = await db('cases')
      .where('customer_id', customerId)
      .leftJoin('users as analyst', 'cases.assigned_analyst_id', 'analyst.id')
      .select('cases.case_id', 'cases.case_number', 'cases.title', 'cases.severity', 'cases.status', 'cases.created_at', 'cases.updated_at', 'analyst.first_name as analyst_first_name', 'analyst.last_name as analyst_last_name')
      .orderBy('cases.updated_at', 'desc')
      .limit(10);

    res.json({ stats: caseStats, recent_cases: recentCases });
  } catch (err) { next(err); }
});

export { router as dashboardRouter };
