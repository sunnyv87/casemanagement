import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: { message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { message: 'Too many login attempts, please try again later' } },
});

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: { error: { message: 'Webhook rate limit exceeded' } },
});
