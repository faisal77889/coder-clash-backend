import { type Request, type Response, type NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

// 1. Extend JwtPayload from jsonwebtoken
export interface UserPayload extends JwtPayload {
  userId: string;
  role: 'admin' | 'user';
}

// 2. Safely override Express Request's `user` property using Omit
export type AuthenticatedRequest = Omit<Request, 'user'> & {
  user?: UserPayload;
};

/**
 * Middleware to authenticate requests via JWT Bearer tokens
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers?.['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return res.status(401).json({ error: 'Token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, secret) as UserPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token missing or invalid' });
  }
};

/**
 * Middleware to enforce role-based access control (RBAC)
 */
export const requireRole = (role: 'admin' | 'user') => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
};