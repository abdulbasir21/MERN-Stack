import { z } from 'zod';
import { CHANGE_CATEGORIES, CONFIDENCE_LEVELS } from '../config/constants.js';

// Stage 1: Document Understanding Item
export const extractedItemSchema = z.object({
  clauseNumber: z.string().nullable().optional(),
  sectionNumber: z.string().nullable().optional(),
  name: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).nullable().optional(),
  unit: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  specification: z.string().nullable().optional(),
  unitPrice: z.union([z.number(), z.string()]).nullable().optional(),
  date: z.string().nullable().optional(),
  sourceSnippet: z.string().nullable().optional(),
  pageNumber: z.number().int().positive().nullable().optional()
});

export const documentUnderstandingSchema = z.object({
  documentCategory: z.string(),
  items: z.array(extractedItemSchema)
});

// Stage 2: Detected Change
export const detectedChangeSchema = z.object({
  type: z.enum(['matched', 'added', 'removed']),
  primaryCategory: z.enum(CHANGE_CATEGORIES),
  itemKey: z.string(),
  title: z.string().min(1),
  original: extractedItemSchema.nullable().optional(),
  revised: extractedItemSchema.nullable().optional(),
  differences: z.array(z.string()).default([])
});

export const changeDetectionStageSchema = z.object({
  changes: z.array(detectedChangeSchema)
});

// Evidence citation item
export const evidenceCitationSchema = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  snippet: z.string().min(1),
  page: z.number().int().positive().nullable().optional(),
  section: z.string().nullable().optional()
});

// Stage 3 & 4: Final Assembled Finding
export const assembledFindingSchema = z.object({
  title: z.string().min(1).max(250),
  category: z.enum(CHANGE_CATEGORIES),
  originalValue: z.string().nullable().optional(),
  revisedValue: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  extractedUnitPrice: z.string().nullable().optional(),
  description: z.string().min(1).max(3000),
  evidence: z.array(evidenceCitationSchema).default([]),
  approvalEvidence: z.object({
    status: z.enum(['approved_in_writing', 'pending_signature', 'not_found']).default('not_found'),
    evidence: z.array(evidenceCitationSchema).default([])
  }).default({ status: 'not_found', evidence: [] }),
  scheduleInfo: z.object({
    originalDate: z.string().nullable().optional(),
    revisedDate: z.string().nullable().optional(),
    differenceDays: z.number().nullable().optional(),
    note: z.string().nullable().optional()
  }).nullable().optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).default('medium'),
  uncertaintyNote: z.string().min(1),
  flags: z.array(z.string()).default([])
});

export const investigationFindingsStageSchema = z.object({
  findings: z.array(assembledFindingSchema)
});
