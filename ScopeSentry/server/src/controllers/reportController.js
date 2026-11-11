import {
  generateInvestigationReport,
  getReportDownloadUrl,
  listProjectReports
} from '../services/reportService.js';

export async function generateReportHandler(req, res, next) {
  try {
    const { id } = req.params; // investigationId
    const report = await generateInvestigationReport({
      investigationId: id,
      ownerId: req.user.id
    });

    res.status(201).json({ data: { report } });
  } catch (err) {
    next(err);
  }
}

export async function getReportDownloadUrlHandler(req, res, next) {
  try {
    const { id } = req.params; // reportId
    const result = await getReportDownloadUrl(id, req.user.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listProjectReportsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const reports = await listProjectReports(projectId, req.user.id);
    res.json({ data: { reports } });
  } catch (err) {
    next(err);
  }
}
