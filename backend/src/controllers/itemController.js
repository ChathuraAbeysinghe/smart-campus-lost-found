import Item from '../models/Item.js';
import mongoose from 'mongoose';
import { addFallbackItem, getFallbackItems } from '../data/fallbackStore.js';
import { uploadImageBuffer } from '../services/cloudinaryService.js';
import { computeImageHash } from '../services/imageHashService.js';
import { runAutoMatchingForItem } from '../services/autoMatchService.js';
import { mapItemWithGemini } from '../services/geminiMappingService.js';

export const getItems = (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(200).json({ items: getFallbackItems() });
  }

  Item.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .lean()
    .then((items) => {
      res.status(200).json({ items });
    })
    .catch((error) => {
      res.status(500).json({ message: error.message });
    });
};

export const createItem = async (req, res) => {
  try {
    const {
      title = '',
      location = '',
      type = 'lost',
      description = '',
      category = '',
      keywords = '',
    } = req.body;

    if (!description.trim()) {
      return res.status(400).json({ message: 'description is required' });
    }

    const parsedKeywords = Array.isArray(keywords)
      ? keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
      : String(keywords)
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean);

    let imageUrl = '';
    let imageHash = '';

    if (req.file?.buffer) {
      imageHash = await computeImageHash(req.file.buffer);
      imageUrl = (await uploadImageBuffer(req.file.buffer, req.file.mimetype)) || '';
    }

    const aiMapping = await mapItemWithGemini({
      title,
      description,
      keywords: parsedKeywords,
      category,
      location,
      imageBuffer: req.file?.buffer,
      mimeType: req.file?.mimetype,
    });

    const itemPayload = {
      type: type === 'found' ? 'found' : 'lost',
      title: title.trim() || description.trim().slice(0, 50),
      description: description.trim(),
      keywords: parsedKeywords,
      category: category.trim(),
      location: location.trim(),
      imageUrl,
      imageHash,
      aiMappedDescription: aiMapping.mappedDescription,
      aiDetailedDescription: aiMapping.detailedDescription,
      aiMappedKeywords: aiMapping.mappedKeywords,
      aiVisualKeywords: aiMapping.visualKeywords,
      aiMappedCategory: aiMapping.mappedCategory,
      aiMappedLocationHint: aiMapping.mappedLocationHint,
      aiProvider: aiMapping.provider,
      aiConfidence: aiMapping.confidence,
      status: 'active',
    };

    const item =
      mongoose.connection.readyState === 1
        ? await Item.create(itemPayload)
        : addFallbackItem({
            ...itemPayload,
            _id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

    const candidates =
      mongoose.connection.readyState === 1
        ? await Item.find({ status: 'active' }).lean()
        : getFallbackItems();

    const autoMatches = runAutoMatchingForItem({
      postedItem: item,
      candidates,
      limit: 5,
    });

    return res.status(201).json({ item, autoMatches });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
