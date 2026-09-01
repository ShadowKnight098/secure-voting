import express from 'express';
import { getStats } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/stats', getStats);

export default router;
