import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/helpers.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(res, 'Access denied. No token provided.', 401);
  }

  try {
    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid token.', 403, error);
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return errorResponse(res, 'Access denied. Admin privileges required.', 403);
  }
  next();
};
