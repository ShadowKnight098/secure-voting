import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  getAvailableElections,
  getFaceDescriptor,
  verifyFace
} from '../controllers/voterController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/elections', getAvailableElections);
router.get('/profile', verifyToken, getProfile);
router.get('/face-descriptor', verifyToken, getFaceDescriptor);
router.post('/verify-face', verifyToken, verifyFace);

export default router;
