import { buildSearchQueryInput, scoreSmartMatch } from './smartMatchService.js';

const buildSuggestion = (score) => {
  if (score >= 60) return 'This might be yours';
  if (score >= 40) return 'Possible match';
  return 'Low confidence match';
};

export const runAutoMatchingForItem = ({ postedItem, candidates, limit = 5 }) => {
  const searchType = postedItem.type === 'lost' ? 'lost' : 'found';
  const targetType = searchType === 'lost' ? 'found' : 'lost';

  const searchInput = buildSearchQueryInput(
    {
      query: postedItem.description || postedItem.title || '',
      description: postedItem.description || '',
      keywords: postedItem.keywords || [],
      category: postedItem.category || '',
      location: postedItem.location || '',
    },
    postedItem.imageHash || ''
  );

  const results = candidates
    .filter((candidate) => candidate.type === targetType)
    .filter((candidate) => String(candidate._id) !== String(postedItem._id))
    .map((candidate) => {
      const match = scoreSmartMatch(searchInput, candidate);
      return {
        ...candidate,
        matchScore: match.totalScore,
        matchLevel: match.matchLevel,
        matchReasons: match.reasons,
        breakdown: match.breakdown,
        suggestion: buildSuggestion(match.totalScore),
      };
    })
    .filter((candidate) => candidate.matchScore >= 40)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
    .map((candidate) => {
      const { imageHash: _ignoredHash, ...safeCandidate } = candidate;
      return safeCandidate;
    });

  return {
    enabled: true,
    searchType,
    targetType,
    count: results.length,
    results,
  };
};
