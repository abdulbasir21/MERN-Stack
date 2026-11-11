/**
 * Evaluates approval evidence status for a finding (BR-I9)
 * Approval is never guessed or assumed.
 * 
 * @param {Array<Object>} evidenceList
 * @returns {{
 *   status: 'approved_in_writing'|'pending_signature'|'not_found',
 *   evidence: Array<Object>
 * }}
 */
export function evaluateApprovalEvidence(evidenceList = []) {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return {
      status: 'not_found',
      evidence: []
    };
  }

  const validEvidence = evidenceList.filter((e) => e && (e.snippet || e.chunkId));
  if (validEvidence.length === 0) {
    return {
      status: 'not_found',
      evidence: []
    };
  }

  // Check if any snippet explicitly contains approval or signature confirmation
  const approvalKeywords = ['approved by', 'signed by', 'authorized signature', 'change order approved', 'accepted by owner'];
  const hasExplicitApproval = validEvidence.some((item) => {
    const text = String(item.snippet || '').toLowerCase();
    return approvalKeywords.some((kw) => text.includes(kw));
  });

  if (hasExplicitApproval) {
    return {
      status: 'approved_in_writing',
      evidence: validEvidence
    };
  }

  const pendingKeywords = ['pending approval', 'submitted for review', 'awaiting signature', 'unapproved change'];
  const hasPending = validEvidence.some((item) => {
    const text = String(item.snippet || '').toLowerCase();
    return pendingKeywords.some((kw) => text.includes(kw));
  });

  if (hasPending) {
    return {
      status: 'pending_signature',
      evidence: validEvidence
    };
  }

  // If evidence was provided but does not show written approval, default to not_found per BR-I9
  return {
    status: 'not_found',
    evidence: validEvidence
  };
}
