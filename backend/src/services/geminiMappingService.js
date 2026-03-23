import { GoogleGenerativeAI } from '@google/generative-ai';

const modelName = 'gemini-1.5-flash';

const sanitizeKeyword = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '');

const toUniqueKeywords = (values) => {
  const parsed = (values || [])
    .map(sanitizeKeyword)
    .filter((value) => value.length > 1);
  return [...new Set(parsed)].slice(0, 12);
};

const parseJsonFromText = (rawText) => {
  if (!rawText) {
    return null;
  }

  const cleaned = rawText.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/```([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
};

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: modelName });
};

const runGemini = async ({ textPrompt, imageBuffer, mimeType }) => {
  const model = getModel();

  if (!model) {
    return null;
  }

  const parts = [{ text: textPrompt }];

  if (imageBuffer) {
    parts.push({
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType || 'image/jpeg',
      },
    });
  }

  const response = await model.generateContent(parts);
  const text = response?.response?.text?.() || '';
  return parseJsonFromText(text);
};

export const mapItemWithGemini = async ({
  title = '',
  description = '',
  keywords = [],
  category = '',
  location = '',
  imageBuffer,
  mimeType,
}) => {
  const prompt = `You are an AI mapping service for a lost-and-found system.
Analyze the user input${imageBuffer ? ' and attached image' : ''}.
Return ONLY JSON with this exact schema:
{
  "mappedDescription": "string",
  "detailedDescription": "string",
  "mappedCategory": "string",
  "mappedKeywords": ["string"],
  "visualKeywords": ["string"],
  "mappedLocationHint": "string",
  "confidence": 0.0
}
Guidelines:
- Improve description clarity in mappedDescription.
- detailedDescription must include concrete visual details from the FULL image (object shape, visible text, color patterns, accessories, unique marks).
- mappedCategory should be short and practical.
- mappedKeywords should be specific object keywords (max 12).
- visualKeywords should focus on what is visually seen in the full image (max 12).
- confidence is 0..1.
User data:
Title: ${title}
Description: ${description}
Keywords: ${(keywords || []).join(', ')}
Category: ${category}
Location: ${location}`;

  try {
    const mapped = await runGemini({
      textPrompt: prompt,
      imageBuffer,
      mimeType,
    });

    if (!mapped) {
      return {
        mappedDescription: description,
        detailedDescription: description,
        mappedCategory: category,
        mappedKeywords: toUniqueKeywords(keywords),
        visualKeywords: [],
        mappedLocationHint: location,
        confidence: 0,
        provider: 'fallback',
      };
    }

    return {
      mappedDescription: String(mapped.mappedDescription || description || '').trim(),
      detailedDescription: String(mapped.detailedDescription || mapped.mappedDescription || description || '').trim(),
      mappedCategory: String(mapped.mappedCategory || category || '').trim(),
      mappedKeywords: toUniqueKeywords([...(keywords || []), ...(mapped.mappedKeywords || [])]),
      visualKeywords: toUniqueKeywords(mapped.visualKeywords || []),
      mappedLocationHint: String(mapped.mappedLocationHint || location || '').trim(),
      confidence: Number(mapped.confidence || 0),
      provider: 'gemini',
    };
  } catch {
    return {
      mappedDescription: description,
      detailedDescription: description,
      mappedCategory: category,
      mappedKeywords: toUniqueKeywords(keywords),
      visualKeywords: [],
      mappedLocationHint: location,
      confidence: 0,
      provider: 'fallback',
    };
  }
};

export const mapSearchInputWithGemini = async ({
  query = '',
  description = '',
  keywords = [],
  category = '',
  location = '',
  imageBuffer,
  mimeType,
}) => {
  const prompt = `You are an AI query mapping service for smart lost-and-found search.
Map this user search input${imageBuffer ? ' and attached image' : ''} to a richer search representation.
Return ONLY JSON with schema:
{
  "normalizedQuery": "string",
  "normalizedDetailedDescription": "string",
  "normalizedCategory": "string",
  "normalizedKeywords": ["string"],
  "normalizedVisualKeywords": ["string"],
  "normalizedLocation": "string",
  "confidence": 0.0
}
User search:
Query: ${query}
Description: ${description}
Keywords: ${(keywords || []).join(', ')}
Category: ${category}
Location: ${location}`;

  try {
    const mapped = await runGemini({
      textPrompt: prompt,
      imageBuffer,
      mimeType,
    });

    if (!mapped) {
      return {
        normalizedQuery: query || description,
        normalizedDetailedDescription: description || query,
        normalizedCategory: category,
        normalizedKeywords: toUniqueKeywords(keywords),
        normalizedVisualKeywords: [],
        normalizedLocation: location,
        confidence: 0,
        provider: 'fallback',
      };
    }

    return {
      normalizedQuery: String(mapped.normalizedQuery || query || description || '').trim(),
      normalizedDetailedDescription: String(
        mapped.normalizedDetailedDescription || mapped.normalizedQuery || description || query || ''
      ).trim(),
      normalizedCategory: String(mapped.normalizedCategory || category || '').trim(),
      normalizedKeywords: toUniqueKeywords([...(keywords || []), ...(mapped.normalizedKeywords || [])]),
      normalizedVisualKeywords: toUniqueKeywords(mapped.normalizedVisualKeywords || []),
      normalizedLocation: String(mapped.normalizedLocation || location || '').trim(),
      confidence: Number(mapped.confidence || 0),
      provider: 'gemini',
    };
  } catch {
    return {
      normalizedQuery: query || description,
      normalizedDetailedDescription: description || query,
      normalizedCategory: category,
      normalizedKeywords: toUniqueKeywords(keywords),
      normalizedVisualKeywords: [],
      normalizedLocation: location,
      confidence: 0,
      provider: 'fallback',
    };
  }
};
