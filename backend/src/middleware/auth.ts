import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/connection';
import { AppError } from './errorHandler';

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'analyst' | 'manager' | 'admin';
  customerIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

export function requireCustomerAccess(customerIdParam: string = 'customerId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (req.user.role === 'admin') {
      return next(); // Admin has access to all customers
    }

    const customerId = req.params[customerIdParam] || req.query.customer_id || req.body?.customer_id;
    if (!customerId) {
      return next();
    }

    const hasAccess = await db('user_customers')
      .where({ user_id: req.user.id, customer_id: customerId })
      .first();

    if (!hasAccess) {
      return next(new AppError('Access denied to this customer tenant', 403));
    }
    next();
  };
}
