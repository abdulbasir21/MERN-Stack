/**
 * Evaluates deterministic confidence level and uncertainty note for a finding (BR-I10)
 * 
 * @param {Object} params
 * @param {boolean} [params.exactClauseMatch=false] - True if clause/identifier matched exactly
 * @param {boolean} [params.exactQuantityMatch=false] - True if quantities were deterministically parsed
 * @param {boolean} [params.hasVerifiedEvidence=false] - True if cited snippets were verified in chunk text
 * @param {boolean} [params.isAiMatched=false] - True if matched via semantic/AI similarity
 * @param {boolean} [params.hasUnverifiedClaims=false] - True if citations could not be verified
 * @returns {{ confidence: 'high'|'medium'|'low', uncertaintyNote: string }}
 */
export function evaluateFindingConfidence({
  exactClauseMatch = false,
  exactQuantityMatch = false,
  hasVerifiedEvidence = false,
  isAiMatched = false,
  hasUnverifiedClaims = false
} = {}) {
  // High confidence: exact match on identifier/clause and confirmed values in both documents with verified evidence
  if (exactClauseMatch && exactQuantityMatch && hasVerifiedEvidence && !hasUnverifiedClaims) {
    return {
      confidence: 'high',
      uncertaintyNote: 'Confirmed from matching clause identifiers and deterministically verified document values.'
    };
  }

  // Also high if exact clause and verified evidence
  if (exactClauseMatch && hasVerifiedEvidence && !isAiMatched && !hasUnverifiedClaims) {
    return {
      confidence: 'high',
      uncertaintyNote: 'Confirmed from matching clause identifiers with verified document citations.'
    };
  }

  // Medium confidence: AI-assisted matching with verified evidence, or exact clause with minor unverified detail
  if (hasVerifiedEvidence && !hasUnverifiedClaims) {
    return {
      confidence: 'medium',
      uncertaintyNote: 'AI-interpreted alignment with verified document evidence. Recommended for human review.'
    };
  }

  if (exactClauseMatch || exactQuantityMatch) {
    return {
      confidence: 'medium',
      uncertaintyNote: 'Deterministic match on identifiers with partial document evidence.'
    };
  }

  // Low confidence: AI-matched without verified evidence or with missing citations
  return {
    confidence: 'low',
    uncertaintyNote: 'Semantic AI interpretation without complete grounding evidence. Requires careful human verification.'
  };
}
