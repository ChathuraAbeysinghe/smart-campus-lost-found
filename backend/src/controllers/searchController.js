import Item from '../models/Item.js';
import mongoose from 'mongoose';
import { getFallbackItems } from '../data/fallbackStore.js';
import { computeImageHash } from '../services/imageHashService.js';
import { buildSearchQueryInput, scoreSmartMatch } from '../services/smartMatchService.js';
import { mapSearchInputWithGemini } from '../services/geminiMappingService.js';

export const searchItems = async (req, res) => {
  try {
    const { searchType = 'lost', limit = 10 } = req.body;
    const targetType = searchType === 'lost' ? 'found' : searchType === 'found' ? 'lost' : null;
    const imageHash = req.file?.buffer ? await computeImageHash(req.file.buffer) : '';
    const inputKeywords = Array.isArray(req.body.keywords)
      ? req.body.keywords
      : String(req.body.keywords || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

    const aiMappedSearch = await mapSearchInputWithGemini({
      query: req.body.query || '',
      description: req.body.description || '',
      keywords: inputKeywords,
      category: req.body.category || '',
      location: req.body.location || '',
      imageBuffer: req.file?.buffer,
      mimeType: req.file?.mimetype,
    });

    const queryInput = buildSearchQueryInput(
      {
        query: aiMappedSearch.normalizedQuery,
        description: aiMappedSearch.normalizedDetailedDescription,
        keywords: aiMappedSearch.normalizedKeywords,
        visualKeywords: aiMappedSearch.normalizedVisualKeywords,
        category: aiMappedSearch.normalizedCategory,
        location: aiMappedSearch.normalizedLocation,
      },
      imageHash
    );

    if (!queryInput.query.trim() && queryInput.keywords.length === 0 && !queryInput.imageHash) {
      return res.status(400).json({
        message: 'Provide query text, keywords, or an image to search',
      });
    }

    const filter = {
      status: 'active',
      ...(targetType ? { type: targetType } : {}),
    };

    const items =
      mongoose.connection.readyState === 1
        ? await Item.find(filter).lean()
        : getFallbackItems().filter((item) => {
            if (item.status !== 'active') {
              return false;
            }

            return targetType ? item.type === targetType : true;
          });

    const ranked = items
      .map((item) => {
        const match = scoreSmartMatch(queryInput, item);
        return {
          ...item,
          matchScore: match.totalScore,
          matchLevel: match.matchLevel,
          matchReasons: match.reasons,
          breakdown: match.breakdown,
          suggestion:
            match.totalScore >= 60
              ? 'This might be yours'
              : match.totalScore >= 40
                ? 'Possible match'
                : 'Low confidence match',
        };
      })
      .filter((item) => item.matchScore >= 30)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Number(limit) || 10)
      .map((item) => {
        const { imageHash: _ignoredHash, ...safeItem } = item;
        return safeItem;
      });

    return res.status(200).json({
      success: true,
      count: ranked.length,
      targetType,
      aiMapping: {
        provider: aiMappedSearch.provider,
        confidence: aiMappedSearch.confidence,
        detailedDescription: aiMappedSearch.normalizedDetailedDescription,
        visualKeywords: aiMappedSearch.normalizedVisualKeywords,
      },
      results: ranked,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
