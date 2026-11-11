import { z } from 'zod';
import {
  createInvestigation,
  getInvestigationById,
  listProjectInvestigations,
  getInvestigationFindings,
  deleteInvestigation
} from '../services/investigationService.js';

export const createInvestigationSchema = z.object({
  originalDocumentId: z.string().min(1, 'Original document ID is required'),
  revisedDocumentId: z.string().min(1, 'Revised document ID is required'),
  supportingDocumentIds: z.array(z.string()).optional().default([])
});

export async function createInvestigationHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { originalDocumentId, revisedDocumentId, supportingDocumentIds } = req.body;

    const result = await createInvestigation({
      ownerId: req.user.id,
      projectId,
      originalDocumentId,
      revisedDocumentId,
      supportingDocumentIds
    });

    // BR-I3: Return 200 if active duplicate investigation was returned; 202 if new investigation started
    const statusCode = result.isExisting ? 200 : 202;
    res.status(statusCode).json({
      data: {
        investigation: result.investigation,
        isExisting: result.isExisting
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getInvestigationHandler(req, res, next) {
  try {
    const { id } = req.params;
    const investigation = await getInvestigationById(id, req.user.id);
    res.json({ data: { investigation } });
  } catch (err) {
    next(err);
  }
}

export async function listProjectInvestigationsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await listProjectInvestigations({
      projectId,
      ownerId: req.user.id,
      page,
      limit
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getInvestigationFindingsHandler(req, res, next) {
  try {
    const { id } = req.params;
    const findings = await getInvestigationFindings(id, req.user.id);
    res.json({ data: { findings } });
  } catch (err) {
    next(err);
  }
}

export async function deleteInvestigationHandler(req, res, next) {
  try {
    const { id } = req.params;
    await deleteInvestigation(id, req.user.id);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}
