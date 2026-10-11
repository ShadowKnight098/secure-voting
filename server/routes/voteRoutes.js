import express from 'express';
import { getBallot, castVote, getReceipt, getResults } from '../controllers/voteController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/ballot/:electionId', verifyToken, getBallot);
router.post('/cast', verifyToken, castVote);
router.get('/receipt/:electionId', verifyToken, getReceipt);
router.get('/results/:electionId', getResults);

export default router;
