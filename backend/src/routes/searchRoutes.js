import { Router } from 'express';
import { searchItems } from '../controllers/searchController.js';
import upload from '../middleware/upload.js';

const router = Router();

router.post('/', upload.single('image'), searchItems);

export default router;
