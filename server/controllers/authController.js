import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return errorResponse(res, 'Username and password are required', 400);
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    
    if (!admin) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      secret,
      { expiresIn: '24h' }
    );

    const { password_hash, ...adminInfo } = admin;

    return successResponse(res, { token, admin: adminInfo }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Login failed', 500, error);
  }
};

export const getProfile = (req, res) => {
  try {
    const admin = db.prepare('SELECT id, username, email, role, created_at FROM admins WHERE id = ?').get(req.user.id);
    
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    return successResponse(res, admin, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get profile', 500, error);
  }
};
