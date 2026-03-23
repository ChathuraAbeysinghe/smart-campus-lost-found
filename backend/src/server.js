import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import itemRoutes from './routes/itemRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import { connectDatabase } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is running' });
});

app.use('/api/items', itemRoutes);
app.use('/api/search', searchRoutes);

const startServer = async () => {
  try {
    await connectDatabase(process.env.MONGODB_URI);
  } catch (error) {
    console.warn(`MongoDB connection failed: ${error.message}`);
    console.warn('Server will continue without DB persistence in this starter setup.');
  }

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
};

startServer();
