import express from 'express';
import { 
  getAllParties, 
  createParty, 
  updateParty, 
  deleteParty 
} from '../controllers/partyController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Allow reading parties for both admin forms and public/voter selection
router.get('/', getAllParties);

// Admin-only mutation routes
router.post('/', verifyToken, requireAdmin, createParty);
router.put('/:id', verifyToken, requireAdmin, updateParty);
router.delete('/:id', verifyToken, requireAdmin, deleteParty);

export default router;
