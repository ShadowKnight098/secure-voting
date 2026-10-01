import express from 'express';
import { getAll, getById, create, toggleVerify, remove } from '../controllers/adminVoterController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id/verify', toggleVerify);
router.delete('/:id', remove);

export default router;
