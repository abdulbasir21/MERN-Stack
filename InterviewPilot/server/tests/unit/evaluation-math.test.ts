import { describe, it, expect } from 'vitest';
import {
  roundHalfUp,
  calculateAnswerScore,
  calculateOverallScore,
  calculateSkillBreakdown,
  calculateStarCoverage,
  calculateDurationSeconds,
  filterInterviewHistory,
  compareInterviewSkills,
  type BaseInterviewHistoryItem,
} from '@interviewpilot/shared';

describe('Phase 10 — Evaluation & Reports Pure Math (EVL-1..5, RPT-1..7)', () => {
  describe('EVL-2 & RPT-1: Half-Up Integer Rounding', () => {
    it('correctly rounds .5 up and .4 down to the nearest integer', () => {
      expect(roundHalfUp(74.5)).toBe(75);
      expect(roundHalfUp(74.4)).toBe(74);
      expect(roundHalfUp(74.6)).toBe(75);
      expect(roundHalfUp(0.5)).toBe(1);
      expect(roundHalfUp(0.49)).toBe(0);
      expect(roundHalfUp(99.5)).toBe(100);
      expect(roundHalfUp(0)).toBe(0);
    });
  });

  describe('EVL-2 & EVL-4: Answer Score Calculation', () => {
    it('calculates the mean of criteria scores rounded half up', () => {
      // 80 + 75 + 85 = 240 / 3 = 80
      const score1 = calculateAnswerScore([
        { criterion: 'technical accuracy', score: 80 },
        { criterion: 'depth', score: 75 },
        { criterion: 'communication', score: 85 },
      ]);
      expect(score1).toBe(80);

      // 70 + 75 = 145 / 2 = 72.5 -> 73 (half-up rounding)
      const score2 = calculateAnswerScore([
        { criterion: 'technical accuracy', score: 70 },
        { criterion: 'problem solving', score: 75 },
      ]);
      expect(score2).toBe(73);
    });

    it('EVL-4: empty answers return score 0 regardless of criteria', () => {
      const emptyScore = calculateAnswerScore(
        [
          { criterion: 'technical accuracy', score: 80 },
          { criterion: 'communication', score: 80 },
        ],
        true // isEmpty = true
      );
      expect(emptyScore).toBe(0);

      const noCriteriaScore = calculateAnswerScore([], false);
      expect(noCriteriaScore).toBe(0);
    });
  });

  describe('RPT-1: Overall Score Calculation', () => {
    it('calculates the overall score across all answers with half-up rounding', () => {
      // [80, 90, 85] -> 255 / 3 = 85
      expect(calculateOverallScore([80, 90, 85])).toBe(85);

      // [70, 75] -> 145 / 2 = 72.5 -> 73
      expect(calculateOverallScore([70, 75])).toBe(73);
    });

    it('EVL-4: includes empty answers (0 score) in the average calculation', () => {
      // Candidate had answers 80, 70, and an empty answer (0) -> 150 / 3 = 50
      expect(calculateOverallScore([80, 70, 0])).toBe(50);
    });

    it('returns null when no answers exist', () => {
      expect(calculateOverallScore([])).toBeNull();
    });
  });

  describe('RPT-1: Skill Breakdown Calculation', () => {
    it('aggregates criteria scores across answers and rounds half up', () => {
      const answers = [
        {
          criteriaScores: [
            { criterion: 'Technical Accuracy', score: 85 },
            { criterion: 'Communication', score: 90 },
          ],
        },
        {
          criteriaScores: [
            { criterion: 'Technical Accuracy', score: 80 },
            { criterion: 'Communication', score: 75 },
            { criterion: 'Problem Solving', score: 95 },
          ],
        },
        {
          // Empty answer is ignored in skill breakdown or has no criteria
          isEmpty: true,
          criteriaScores: [],
        },
      ];

      const breakdown = calculateSkillBreakdown(answers);

      // Technical Accuracy: (85 + 80) / 2 = 82.5 -> 83
      expect(breakdown['Technical Accuracy'].meanScore).toBe(83);
      expect(breakdown['Technical Accuracy'].count).toBe(2);

      // Communication: (90 + 75) / 2 = 82.5 -> 83
      expect(breakdown['Communication'].meanScore).toBe(83);
      expect(breakdown['Communication'].count).toBe(2);

      // Problem Solving: 95 / 1 = 95
      expect(breakdown['Problem Solving'].meanScore).toBe(95);
      expect(breakdown['Problem Solving'].count).toBe(1);
    });
  });

  describe('RPT-1: STAR Coverage for Behavioral Interviews', () => {
    it('calculates the share of behavioral answers containing each STAR component', () => {
      const answers = [
        {
          star: { situation: true, task: true, action: true, result: true },
        },
        {
          star: { situation: true, task: true, action: true, result: false },
        },
        {
          star: { situation: true, task: false, action: false, result: false },
        },
      ];

      const coverage = calculateStarCoverage(answers);

      // 3 answers total
      expect(coverage.totalBehavioralAnswers).toBe(3);
      // Situation: 3/3 = 100%
      expect(coverage.situationShare).toBe(100);
      // Task: 2/3 = 66.666% -> 67%
      expect(coverage.taskShare).toBe(67);
      // Action: 2/3 = 66.666% -> 67%
      expect(coverage.actionShare).toBe(67);
      // Result: 1/3 = 33.333% -> 33%
      expect(coverage.resultShare).toBe(33);
    });

    it('returns 0 when no behavioral answers are evaluated', () => {
      const coverage = calculateStarCoverage([]);
      expect(coverage.totalBehavioralAnswers).toBe(0);
      expect(coverage.situationShare).toBe(0);
      expect(coverage.resultShare).toBe(0);
    });
  });

  describe('RPT-5: Duration Calculation', () => {
    it('calculates exact duration in whole seconds between startedAt and endedAt', () => {
      const start = new Date('2026-11-11T12:00:00.000Z');
      const end = new Date('2026-11-11T12:15:30.000Z');

      // 15 min 30 sec = 930 seconds
      expect(calculateDurationSeconds(start, end)).toBe(930);
    });

    it('handles null or invalid timestamps gracefully', () => {
      expect(calculateDurationSeconds(null, new Date())).toBe(0);
      expect(calculateDurationSeconds(new Date(), null)).toBe(0);
      expect(calculateDurationSeconds('invalid', new Date())).toBe(0);
    });
  });

  describe('RPT-6: Interview History Search, Filter & Pagination', () => {
    const mockHistory: BaseInterviewHistoryItem[] = [
      {
        id: '1',
        role: 'Senior React Engineer',
        type: 'TECHNICAL',
        createdAt: '2026-11-10T10:00:00Z',
        overallScore: 88,
        durationSeconds: 900,
        status: 'COMPLETED',
      },
      {
        id: '2',
        role: 'Backend Architect (Go/Node)',
        type: 'TECHNICAL',
        createdAt: '2026-11-09T14:00:00Z',
        overallScore: 76,
        durationSeconds: 900,
        status: 'COMPLETED',
      },
      {
        id: '3',
        role: 'Engineering Manager',
        type: 'BEHAVIORAL',
        createdAt: '2026-11-08T09:00:00Z',
        overallScore: 92,
        durationSeconds: 1200,
        status: 'COMPLETED',
      },
      {
        id: '4',
        role: 'Junior Frontend Developer',
        type: 'TECHNICAL',
        createdAt: '2026-11-07T11:00:00Z',
        overallScore: 65,
        durationSeconds: 800,
        status: 'COMPLETED',
      },
    ];

    it('searches by role with case-insensitive contains', () => {
      const res = filterInterviewHistory(mockHistory, { role: 'frontend' });
      expect(res.total).toBe(1);
      expect(res.items[0].id).toBe('4');

      const resArch = filterInterviewHistory(mockHistory, { role: 'ARCHITECT' });
      expect(resArch.total).toBe(1);
      expect(resArch.items[0].id).toBe('2');
    });

    it('filters by interview type', () => {
      const behavioral = filterInterviewHistory(mockHistory, { type: 'BEHAVIORAL' });
      expect(behavioral.total).toBe(1);
      expect(behavioral.items[0].id).toBe('3');

      const technical = filterInterviewHistory(mockHistory, { type: 'TECHNICAL' });
      expect(technical.total).toBe(3);
    });

    it('sorts newest first and enforces default 20 per page pagination', () => {
      const res = filterInterviewHistory(mockHistory, { page: 1, pageSize: 2 });
      expect(res.total).toBe(4);
      expect(res.totalPages).toBe(2);
      expect(res.items.length).toBe(2);
      // Newest first
      expect(res.items[0].id).toBe('1');
      expect(res.items[1].id).toBe('2');
    });
  });

  describe('RPT-7: Progress Comparison Matrix', () => {
    it('compares two interviews skill breakdowns and calculates diffs', () => {
      const interviewA = {
        'Technical Accuracy': { meanScore: 70 },
        'Communication': { meanScore: 80 },
        'Problem Solving': { meanScore: 65 },
      };

      const interviewB = {
        'Technical Accuracy': { meanScore: 85 },
        'Communication': { meanScore: 78 },
        'System Architecture': { meanScore: 90 },
      };

      const comparison = compareInterviewSkills(interviewA, interviewB);

      // Technical Accuracy: +15
      expect(comparison['Technical Accuracy']).toEqual({ scoreA: 70, scoreB: 85, diff: 15 });
      // Communication: -2
      expect(comparison['Communication']).toEqual({ scoreA: 80, scoreB: 78, diff: -2 });
      // Problem Solving: only in A
      expect(comparison['Problem Solving']).toEqual({ scoreA: 65, scoreB: null, diff: null });
      // System Architecture: only in B
      expect(comparison['System Architecture']).toEqual({ scoreA: null, scoreB: 90, diff: null });
    });
  });
});
