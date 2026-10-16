import express from 'express';
import { 
  getBallot, 
  castVote, 
  getReceipt, 
  getResults,
  getAuditLedger,
  verifyReceiptCode
} from '../controllers/voteController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/ballot/:electionId', verifyToken, getBallot);
router.post('/cast', verifyToken, castVote);
router.get('/receipt/:electionId', verifyToken, getReceipt);
router.get('/results/:electionId', getResults);
router.get('/audit/:electionId', verifyToken, getAuditLedger);
router.get('/verify-receipt/:receiptCode', verifyReceiptCode);
router.get('/verify/:receiptCode', verifyReceiptCode);

export default router;
