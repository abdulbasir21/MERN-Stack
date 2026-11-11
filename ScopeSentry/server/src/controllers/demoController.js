import { z } from 'zod';
import {
  getDemoProjects,
  getDemoProjectById,
  getDemoProjectDocuments,
  getDemoDocumentById,
  runDemoInvestigation,
  getDemoInvestigationFindings
} from '../services/demoService.js';

export const runDemoInvestigationSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  originalDocumentId: z.string().min(1, 'Original document ID is required'),
  revisedDocumentId: z.string().min(1, 'Revised document ID is required'),
  supportingDocumentIds: z.array(z.string()).optional().default([])
});

export async function getDemoProjectsHandler(req, res, next) {
  try {
    const projects = await getDemoProjects();
    res.json({ data: { projects } });
  } catch (err) {
    next(err);
  }
}

export async function getDemoProjectByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const project = await getDemoProjectById(id);
    res.json({ data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function getDemoProjectDocumentsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const documents = await getDemoProjectDocuments(projectId);
    res.json({ data: { documents } });
  } catch (err) {
    next(err);
  }
}

export async function getDemoDocumentByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const document = await getDemoDocumentById(id);
    res.json({ data: { document } });
  } catch (err) {
    next(err);
  }
}

export async function runDemoInvestigationHandler(req, res, next) {
  try {
    const { projectId, originalDocumentId, revisedDocumentId, supportingDocumentIds } = req.body;
    const existingSessionId = req.cookies?.scopesentry_demo_session || req.headers['x-demo-session-id'];

    const result = await runDemoInvestigation({
      projectId,
      originalDocumentId,
      revisedDocumentId,
      supportingDocumentIds,
      demoSessionId: existingSessionId
    });

    // Set demo session cookie (httpOnly, 24-hour expiration)
    res.cookie('scopesentry_demo_session', result.demoSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      data: {
        investigation: result.investigation,
        demoSessionId: result.demoSessionId,
        isExisting: result.isExisting,
        isDemo: true
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getDemoInvestigationFindingsHandler(req, res, next) {
  try {
    const { id } = req.params;
    const sessionId = req.cookies?.scopesentry_demo_session || req.headers['x-demo-session-id'];
    const findings = await getDemoInvestigationFindings(id, sessionId);
    res.json({ data: { findings, isDemo: true } });
  } catch (err) {
    next(err);
  }
}
