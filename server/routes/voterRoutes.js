import express from 'express';
import { register, login, getProfile, getAvailableElections } from '../controllers/voterController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/elections', getAvailableElections);
router.get('/profile', verifyToken, getProfile);

export default router;
