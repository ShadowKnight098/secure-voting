import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/authRoutes.js';
import electionRoutes from './routes/electionRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import voterRoutes from './routes/voterRoutes.js';
import adminVoterRoutes from './routes/adminVoterRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/candidates', 'uploads/faces'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const app = express();

// Allow requests from localhost and deployed domains
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Secure Voting API is running' });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/voters', adminVoterRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
