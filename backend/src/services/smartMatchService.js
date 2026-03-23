import { imageHashSimilarity } from './imageHashService.js';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return [...new Set(normalized.split(' ').filter((token) => token.length > 1))];
};

const mapTermFrequency = (text) => {
  const terms = tokenize(text);
  const tf = new Map();

  terms.forEach((term) => {
    tf.set(term, (tf.get(term) || 0) + 1);
  });

  return tf;
};

const cosineSimilarity = (textA, textB) => {
  const tfA = mapTermFrequency(textA);
  const tfB = mapTermFrequency(textB);

  if (tfA.size === 0 || tfB.size === 0) {
    return 0;
  }

  const terms = new Set([...tfA.keys(), ...tfB.keys()]);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  terms.forEach((term) => {
    const a = tfA.get(term) || 0;
    const b = tfB.get(term) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  });

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const keywordOverlap = (requestedKeywords, itemKeywords) => {
  const a = new Set((requestedKeywords || []).map((value) => normalizeText(value)).filter(Boolean));
  const b = new Set((itemKeywords || []).map((value) => normalizeText(value)).filter(Boolean));

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let common = 0;
  a.forEach((term) => {
    if (b.has(term)) {
      common += 1;
    }
  });

  return common / Math.max(a.size, b.size);
};

const toScore = (value) => Math.round(Math.min(1, Math.max(0, value)) * 100);

const getMatchLabel = (score) => {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  return 'UNLIKELY';
};

export const scoreSmartMatch = (searchInput, item) => {
  const searchText = [
    searchInput.query,
    searchInput.description,
    ...(searchInput.keywords || []),
    ...(searchInput.visualKeywords || []),
  ].join(' ');

  const itemKeywordsMerged = [
    ...(item.keywords || []),
    ...(item.aiMappedKeywords || []),
  ];

  const itemVisualKeywordsMerged = [
    ...(item.aiVisualKeywords || []),
    ...(item.aiMappedKeywords || []),
  ];

  const itemText = [
    item.title,
    item.description,
    item.aiMappedDescription,
    item.aiDetailedDescription,
    item.category,
    item.aiMappedCategory,
    item.location,
    item.aiMappedLocationHint,
    ...itemKeywordsMerged,
    ...itemVisualKeywordsMerged,
  ].join(' ');

  const descriptionScore = cosineSimilarity(searchText, itemText);
  const keywordScore = keywordOverlap(searchInput.keywords, itemKeywordsMerged);
  const visualKeywordScore = keywordOverlap(searchInput.visualKeywords, itemVisualKeywordsMerged);
  const detailDescriptionScore = cosineSimilarity(
    searchInput.description || searchInput.query,
    item.aiDetailedDescription || item.aiMappedDescription || item.description
  );
  const locationScore = cosineSimilarity(searchInput.location, item.location || '');

  let categoryScore = 0;
  if (searchInput.category && item.category) {
    categoryScore = normalizeText(searchInput.category) === normalizeText(item.category) ? 1 : 0;
  }

  const imageScore = imageHashSimilarity(searchInput.imageHash, item.imageHash);

  const weighted =
    descriptionScore * 0.25 +
    detailDescriptionScore * 0.2 +
    keywordScore * 0.2 +
    visualKeywordScore * 0.15 +
    locationScore * 0.1 +
    categoryScore * 0.05 +
    imageScore * 0.05;

  const totalScore = toScore(weighted);

  const reasons = [];
  if (descriptionScore >= 0.45) reasons.push('Description is semantically similar');
  if (detailDescriptionScore >= 0.5) reasons.push('Detailed description is closely matched');
  if (keywordScore >= 0.4) reasons.push('Keyword overlap is strong');
  if (visualKeywordScore >= 0.4) reasons.push('Visual keyword overlap from image scan is strong');
  if (locationScore >= 0.4) reasons.push('Location is similar');
  if (categoryScore === 1) reasons.push('Category matches exactly');
  if (imageScore >= 0.75) reasons.push('Uploaded image looks visually similar');

  return {
    totalScore,
    matchLevel: getMatchLabel(totalScore),
    reasons,
    breakdown: {
      descriptionScore: toScore(descriptionScore),
      detailDescriptionScore: toScore(detailDescriptionScore),
      keywordScore: toScore(keywordScore),
      visualKeywordScore: toScore(visualKeywordScore),
      locationScore: toScore(locationScore),
      categoryScore: toScore(categoryScore),
      imageScore: toScore(imageScore),
    },
  };
};

export const buildSearchQueryInput = (body, imageHash = '') => ({
  query: body.query || body.description || body.title || '',
  description: body.description || '',
  keywords: Array.isArray(body.keywords)
    ? body.keywords
    : String(body.keywords || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
  visualKeywords: Array.isArray(body.visualKeywords)
    ? body.visualKeywords
    : String(body.visualKeywords || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
  category: body.category || '',
  location: body.location || '',
  imageHash,
});
