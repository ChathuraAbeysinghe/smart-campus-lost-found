import { Router } from 'express';
import { createItem, getItems } from '../controllers/itemController.js';
import upload from '../middleware/upload.js';

const router = Router();

router.get('/', getItems);
router.post('/', upload.single('image'), createItem);

export default router;
