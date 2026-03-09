import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { authRouter } from './routes/auth';
import { alertRouter } from './routes/alerts';
import { caseRouter } from './routes/cases';
import { customerRouter } from './routes/customers';
import { userRouter } from './routes/users';
import { dashboardRouter } from './routes/dashboard';
import { integrationRouter } from './routes/integrations';
import { auditRouter } from './routes/audit';
import { reportRouter } from './routes/reports';
import { webhookRouter } from './routes/webhooks';
import { notificationRouter } from './routes/notifications';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/cases', caseRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/integrations', integrationRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/notifications', notificationRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`SOC Case Management Platform API running on port ${PORT}`);
});

export default app;
