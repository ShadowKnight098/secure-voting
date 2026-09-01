import express from 'express';
import { getAll, getById, create, update, remove } from '../controllers/candidateController.js';
import { verifyToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', upload.single('photo'), create);
router.put('/:id', upload.single('photo'), update);
router.delete('/:id', remove);

export default router;
