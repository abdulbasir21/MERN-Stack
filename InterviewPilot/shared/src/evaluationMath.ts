/**
 * Pure evaluation and report math functions according to EVL-1..5 and RPT-1..7.
 * All derived values (scores, averages, durations, STAR shares) are calculated at read time, NEVER stored.
 */

export interface CriterionScoreItem {
  criterion: string;
  score: number;
}

export interface StarPresence {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface AnswerForScoring {
  criteriaScores: CriterionScoreItem[];
  isEmpty?: boolean;
  star?: StarPresence | null;
}

/**
 * Standard half-up integer rounding (EVL-2, RPT-1):
 * 0.5 rounds up to 1, 74.5 rounds up to 75.
 */
export function roundHalfUp(value: number): number {
  if (isNaN(value)) return 0;
  // Guard against tiny binary floating point inaccuracies (e.g. 74.49999999999999)
  const adjusted = Number(value.toFixed(8));
  return Math.floor(adjusted + 0.5);
}

/**
 * EVL-2: Answer score = mean of its criteria scores, rounded half up.
 * If empty answer or no criteria, returns 0.
 */
export function calculateAnswerScore(criteria: CriterionScoreItem[], isEmpty = false): number {
  if (isEmpty || !criteria || criteria.length === 0) {
    return 0;
  }

  const sum = criteria.reduce((acc, c) => acc + (typeof c.score === 'number' ? c.score : 0), 0);
  const mean = sum / criteria.length;
  return roundHalfUp(mean);
}

/**
 * RPT-1: Overall score = mean of all answer scores (including empty ones as 0), rounded half up.
 * Returns null if no answers exist.
 */
export function calculateOverallScore(answerScores: number[]): number | null {
  if (!answerScores || answerScores.length === 0) {
    return null;
  }

  const sum = answerScores.reduce((acc, s) => acc + s, 0);
  const mean = sum / answerScores.length;
  return roundHalfUp(mean);
}

/**
 * RPT-1: Skill breakdown = mean per criterion across all answers that contain it, rounded half up.
 */
export function calculateSkillBreakdown(
  answers: AnswerForScoring[]
): Record<string, { meanScore: number; count: number }> {
  const map: Record<string, number[]> = {};

  for (const ans of answers) {
    if (ans.isEmpty || !ans.criteriaScores) continue;
    for (const c of ans.criteriaScores) {
      if (!c.criterion) continue;
      if (!map[c.criterion]) {
        map[c.criterion] = [];
      }
      map[c.criterion].push(c.score);
    }
  }

  const result: Record<string, { meanScore: number; count: number }> = {};
  for (const [criterion, scores] of Object.entries(map)) {
    if (scores.length === 0) continue;
    const sum = scores.reduce((a, b) => a + b, 0);
    result[criterion] = {
      meanScore: roundHalfUp(sum / scores.length),
      count: scores.length,
    };
  }

  return result;
}

/**
 * RPT-1: STAR coverage = share of behavioral answers containing each STAR part.
 * Expressed as integer percentage (0–100) or count.
 */
export function calculateStarCoverage(
  behavioralAnswers: { star?: StarPresence | null }[]
): {
  situationShare: number;
  taskShare: number;
  actionShare: number;
  resultShare: number;
  totalBehavioralAnswers: number;
} {
  const valid = behavioralAnswers.filter((a) => a.star !== null && a.star !== undefined);
  const total = valid.length;

  if (total === 0) {
    return {
      situationShare: 0,
      taskShare: 0,
      actionShare: 0,
      resultShare: 0,
      totalBehavioralAnswers: 0,
    };
  }

  let sCount = 0;
  let tCount = 0;
  let aCount = 0;
  let rCount = 0;

  for (const ans of valid) {
    if (ans.star?.situation) sCount++;
    if (ans.star?.task) tCount++;
    if (ans.star?.action) aCount++;
    if (ans.star?.result) rCount++;
  }

  return {
    situationShare: roundHalfUp((sCount / total) * 100),
    taskShare: roundHalfUp((tCount / total) * 100),
    actionShare: roundHalfUp((aCount / total) * 100),
    resultShare: roundHalfUp((rCount / total) * 100),
    totalBehavioralAnswers: total,
  };
}

/**
 * RPT-5: Duration = endedAt - startedAt in whole seconds (calculated).
 */
export function calculateDurationSeconds(
  startedAt: Date | string | null | undefined,
  endedAt: Date | string | null | undefined
): number {
  if (!startedAt || !endedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

/**
 * RPT-6: History search, filter, and pagination.
 */
export interface HistoryFilterParams {
  role?: string;
  type?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  pageSize?: number;
}

export interface BaseInterviewHistoryItem {
  id: string;
  role: string;
  type: string;
  createdAt: string | Date;
  overallScore: number | null;
  durationSeconds: number;
  status: string;
}

export function filterInterviewHistory<T extends BaseInterviewHistoryItem>(
  items: T[],
  filters: HistoryFilterParams = {}
): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20)); // RPT-6: 20 per page default

  let filtered = [...items];

  // Search by role text (case-insensitive contains)
  if (filters.role?.trim()) {
    const term = filters.role.trim().toLowerCase();
    filtered = filtered.filter((item) => item.role.toLowerCase().includes(term));
  }

  // Filter by interview type
  if (filters.type?.trim()) {
    const typeUpper = filters.type.trim().toUpperCase();
    filtered = filtered.filter((item) => item.type.toUpperCase() === typeUpper);
  }

  // Filter by date range (UTC)
  if (filters.startDate) {
    const startMs = new Date(filters.startDate).getTime();
    if (!isNaN(startMs)) {
      filtered = filtered.filter((item) => new Date(item.createdAt).getTime() >= startMs);
    }
  }

  if (filters.endDate) {
    const endMs = new Date(filters.endDate).getTime();
    if (!isNaN(endMs)) {
      filtered = filtered.filter((item) => new Date(item.createdAt).getTime() <= endMs);
    }
  }

  // Order newest first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * RPT-7: Progress comparison comparing two selected interviews' skill breakdowns.
 */
export function compareInterviewSkills(
  skillsA: Record<string, { meanScore: number }>,
  skillsB: Record<string, { meanScore: number }>
): Record<string, { scoreA: number | null; scoreB: number | null; diff: number | null }> {
  const allCriteria = new Set([...Object.keys(skillsA), ...Object.keys(skillsB)]);
  const comparison: Record<string, { scoreA: number | null; scoreB: number | null; diff: number | null }> = {};

  for (const criterion of allCriteria) {
    const scoreA = skillsA[criterion]?.meanScore ?? null;
    const scoreB = skillsB[criterion]?.meanScore ?? null;
    const diff = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;

    comparison[criterion] = {
      scoreA,
      scoreB,
      diff,
    };
  }

  return comparison;
}
