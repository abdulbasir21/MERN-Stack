import PDFDocument from 'pdfkit';
import { Investigation } from '../models/Investigation.js';
import { Finding } from '../models/Finding.js';
import { Project } from '../models/Project.js';
import { Report } from '../models/Report.js';
import { uploadPrivateFile, getPrivateDownloadUrl } from '../integrations/storage.js';
import { calculateFindingImpact } from '../domain/impactCalculator.js';
import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

const LIMITATIONS_TEXT =
  'ScopeSentry highlights potential changes and estimates impacts to help project managers investigate. Estimates depend on supplied prices and extracted values and are not verified financial or legal conclusions. AI interpretations may be wrong. A human must review every finding. Approval means reviewed by the user, not a legal or contractual determination.';

/**
 * Generates an executive 12-section PDF report for a completed investigation (BR-RP1, BR-RP2, BR-RP3, BR-RP4, BR-RP5)
 */
export async function generateInvestigationReport({ investigationId, ownerId }) {
  const investigation = await Investigation.findOne({ _id: investigationId, ownerId })
    .populate('originalDocumentId', 'originalFilename category')
    .populate('revisedDocumentId', 'originalFilename category')
    .populate('supportingDocumentIds', 'originalFilename category');

  if (!investigation) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Investigation not found', 404);
  }

  // BR-RP1: Reports are generated only from completed investigations
  if (investigation.status !== 'completed') {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'Report can only be generated from a completed investigation',
      400
    );
  }

  const project = await Project.findOne({ _id: investigation.projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  const findings = await Finding.find({ investigationId }).sort({ createdAt: 1 });

  // BR-RP3: Executive summary counts computed from findings dynamically at generation time
  const totalFindings = findings.length;
  const reviewCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    needs_further_review: 0
  };

  let totalEstimatedCost = 0;
  let costEstimatesCount = 0;

  const enrichedFindings = findings.map((f) => {
    const fObj = f.toJSON();
    reviewCounts[fObj.reviewStatus] = (reviewCounts[fObj.reviewStatus] || 0) + 1;

    const impact = calculateFindingImpact({
      originalQuantity: fObj.originalValue,
      revisedQuantity: fObj.revisedValue,
      extractedUnitPrice: fObj.extractedUnitPrice,
      unitPriceOverride: fObj.unitPriceOverride,
      originalDate: fObj.scheduleInfo?.originalDate,
      revisedDate: fObj.scheduleInfo?.revisedDate
    });

    if (impact.estimatedCostDifference !== null) {
      totalEstimatedCost += Number(impact.estimatedCostDifference);
      costEstimatesCount += 1;
    }

    return {
      ...fObj,
      impact
    };
  });

  // Generate PDF buffer using PDFKit with all 12 sections in exact order (BR-RP2)
  const pdfBuffer = await buildPdfBuffer({
    project,
    investigation,
    enrichedFindings,
    metrics: {
      totalFindings,
      reviewCounts,
      totalEstimatedCost,
      costEstimatesCount
    }
  });

  // Store in ImageKit (private file) per BR-RP4
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;

  const uploadResult = await uploadPrivateFile({
    fileBuffer: pdfBuffer,
    fileName: filename,
    folder: `/projects/${project._id}/reports/`
  });

  // Persist report metadata record (BR-RP4)
  const report = await Report.create({
    investigationId: investigation._id,
    ownerId,
    projectId: project._id,
    storedFileId: uploadResult.fileId,
    storedFilePath: uploadResult.filePath,
    filename,
    generatedAt: new Date()
  });

  return report;
}

/**
 * Builds the PDF buffer adhering to the 12 required sections in order (BR-RP2)
 */
function buildPdfBuffer({ project, investigation, enrichedFindings, metrics }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Colors: Navy (#0f172a), Slate (#475569)
    const PRIMARY = '#0f172a';
    const SECONDARY = '#475569';

    // 1. SECTION 1: Project Information (BR-RP2 #1)
    doc.fillColor(PRIMARY).fontSize(20).text('ScopeSentry Change Intelligence Report', { align: 'left' });
    doc.fillColor(SECONDARY).fontSize(10).text('Deterministic Scope & Cost Detective', { align: 'left' });
    doc.moveDown(1);

    doc.fillColor(PRIMARY).fontSize(14).text('1. Project Information');
    doc.fillColor(SECONDARY).fontSize(10);
    doc.text(`Project Name: ${project.name}`);
    doc.text(`Type: ${project.projectType.replace('_', ' ')}`);
    doc.text(`Location: ${project.location || 'Not specified'}`);
    doc.text(`Currency: ${project.currency || 'USD'}`);
    doc.text(`Project Budget: ${project.budget ? `$${project.budget.toLocaleString()}` : 'Not specified'}`);
    doc.moveDown(1);

    // 2. SECTION 2: Investigation Date (BR-RP2 #2)
    doc.fillColor(PRIMARY).fontSize(14).text('2. Investigation Date');
    doc.fillColor(SECONDARY).fontSize(10);
    doc.text(`Investigation ID: ${investigation._id}`);
    doc.text(`Started At: ${new Date(investigation.startedAt || investigation.createdAt).toUTCString()}`);
    doc.text(`Completed At: ${new Date(investigation.finishedAt || Date.now()).toUTCString()}`);
    doc.moveDown(1);

    // 3. SECTION 3: Executive Summary (BR-RP2 #3, BR-RP3)
    doc.fillColor(PRIMARY).fontSize(14).text('3. Executive Summary');
    doc.fillColor(SECONDARY).fontSize(10);
    doc.text(`Total Scope Changes Detected: ${metrics.totalFindings}`);
    doc.text(`Total Potential Cost Delta (Estimate): $${metrics.totalEstimatedCost.toLocaleString()} (${metrics.costEstimatesCount} findings with confirmed unit prices)`);
    doc.text(`Review Status Breakdown:`);
    doc.text(`  - Pending Review: ${metrics.reviewCounts.pending}`);
    doc.text(`  - Approved by PM: ${metrics.reviewCounts.approved}`);
    doc.text(`  - Rejected: ${metrics.reviewCounts.rejected}`);
    doc.text(`  - Needs Further Review: ${metrics.reviewCounts.needs_further_review}`);
    doc.moveDown(1);

    // 4. SECTION 4: Documents Compared (BR-RP2 #4)
    doc.fillColor(PRIMARY).fontSize(14).text('4. Documents Compared');
    doc.fillColor(SECONDARY).fontSize(10);
    doc.text(`Original Document: ${investigation.originalDocumentId?.originalFilename || 'Document'} (${investigation.originalDocumentId?.category?.replace('_', ' ') || ''})`);
    doc.text(`Revised Document: ${investigation.revisedDocumentId?.originalFilename || 'Document'} (${investigation.revisedDocumentId?.category?.replace('_', ' ') || ''})`);
    if (investigation.supportingDocumentIds?.length > 0) {
      doc.text(`Supporting Documents (${investigation.supportingDocumentIds.length}):`);
      for (const sup of investigation.supportingDocumentIds) {
        doc.text(`  - ${sup.originalFilename} (${sup.category?.replace('_', ' ')})`);
      }
    }
    doc.moveDown(1);

    // 5. SECTION 5: Detected Changes (BR-RP2 #5)
    doc.fillColor(PRIMARY).fontSize(14).text('5. Detected Changes');
    doc.fillColor(SECONDARY).fontSize(10);
    if (enrichedFindings.length === 0) {
      doc.text('No scope changes were detected between documents.');
    } else {
      enrichedFindings.forEach((f, idx) => {
        doc.fillColor(PRIMARY).text(`${idx + 1}. [${f.category.replace('_', ' ')}] ${f.title}`);
        doc.fillColor(SECONDARY).text(`   ${f.description}`);
      });
    }
    doc.moveDown(1);

    // 6. SECTION 6: Original vs Revised Values (BR-RP2 #6)
    doc.fillColor(PRIMARY).fontSize(14).text('6. Original vs Revised Values');
    doc.fillColor(SECONDARY).fontSize(10);
    enrichedFindings.forEach((f, idx) => {
      doc.text(`${idx + 1}. ${f.title}:`);
      doc.text(`   Original: ${f.originalValue || '(None / Not specified)'}`);
      doc.text(`   Revised: ${f.revisedValue || '(None / Removed)'}`);
      if (f.impact.quantityDifference !== null) {
        doc.text(`   Quantity Delta: ${Number(f.impact.quantityDifference) > 0 ? '+' : ''}${f.impact.quantityDifference} ${f.unit || 'units'}`);
      }
    });
    doc.moveDown(1);

    // 7. SECTION 7: Supporting Evidence (BR-RP2 #7)
    doc.fillColor(PRIMARY).fontSize(14).text('7. Supporting Evidence');
    doc.fillColor(SECONDARY).fontSize(10);
    enrichedFindings.forEach((f, idx) => {
      doc.text(`Evidence for Finding #${idx + 1} (${f.title}):`);
      if (f.evidence.length === 0) {
        doc.text(`   Evidence not found in referenced documents.`);
      } else {
        f.evidence.forEach((ev) => {
          doc.text(`   - Citation: "${ev.snippet}" (Page: ${ev.page || 'N/A'}, Section: ${ev.section || 'N/A'})`);
        });
      }
    });
    doc.moveDown(1);

    // 8. SECTION 8: Potential Cost Impacts (BR-RP2 #8, BR-RP5)
    doc.fillColor(PRIMARY).fontSize(14).text('8. Potential Cost Impacts (Estimate)');
    doc.fillColor(SECONDARY).fontSize(10);
    enrichedFindings.forEach((f, idx) => {
      if (f.impact.estimatedCostDifference !== null) {
        doc.text(`Finding #${idx + 1}: $${Number(f.impact.estimatedCostDifference).toLocaleString()} [Estimate - Price Source: ${f.impact.unitPriceSource} @ $${f.impact.activeUnitPrice}/unit]`);
      } else {
        doc.text(`Finding #${idx + 1}: ${f.impact.costEstimateNote || 'Cannot estimate: no unit price supplied'}`);
      }
      if (f.impact.priceDelta !== null) {
        doc.text(`   Unit Price Delta: $${f.impact.priceDelta} (revised unit price changed)`);
      }
    });
    doc.moveDown(1);

    // 9. SECTION 9: Potential Schedule Impacts (BR-RP2 #9)
    doc.fillColor(PRIMARY).fontSize(14).text('9. Potential Schedule Impacts');
    doc.fillColor(SECONDARY).fontSize(10);
    enrichedFindings.forEach((f, idx) => {
      if (f.impact.scheduleDifferenceDays !== null) {
        doc.text(`Finding #${idx + 1}: ${Number(f.impact.scheduleDifferenceDays) > 0 ? '+' : ''}${f.impact.scheduleDifferenceDays} calendar days`);
      } else {
        doc.text(`Finding #${idx + 1}: ${f.impact.scheduleNote || 'Schedule impact not determinable'}`);
      }
    });
    doc.moveDown(1);

    // 10. SECTION 10: Approval Findings (BR-RP2 #10)
    doc.fillColor(PRIMARY).fontSize(14).text('10. Approval Findings');
    doc.fillColor(SECONDARY).fontSize(10);
    enrichedFindings.forEach((f, idx) => {
      doc.text(`Finding #${idx + 1}: Approval Status = ${f.approvalEvidence.status}`);
      if (f.approvalEvidence.evidence.length > 0) {
        f.approvalEvidence.evidence.forEach((ev) => {
          doc.text(`   Approval Grounding: "${ev.snippet}"`);
        });
      }
    });
    doc.moveDown(1);

    // 11. SECTION 11: Assumptions and Limitations (BR-RP2 #11, BR-RP5)
    doc.fillColor(PRIMARY).fontSize(14).text('11. Assumptions and Limitations');
    doc.fillColor(SECONDARY).fontSize(9);
    doc.text(LIMITATIONS_TEXT, { align: 'justify' });
    doc.moveDown(1);

    // 12. SECTION 12: Human Review Status (BR-RP2 #12)
    doc.fillColor(PRIMARY).fontSize(14).text('12. Human Review Status');
    doc.fillColor(SECONDARY).fontSize(10);
    doc.text('Notice: Approved = reviewed by the user; not a legal or contractual determination.');
    enrichedFindings.forEach((f, idx) => {
      doc.text(`Finding #${idx + 1} (${f.title}): Current Status = ${f.reviewStatus.toUpperCase()}`);
    });

    doc.end();
  });
}

/**
 * Generates an authenticated download URL for a report (BR-RP4)
 */
export async function getReportDownloadUrl(reportId, ownerId) {
  const report = await Report.findOne({ _id: reportId, ownerId });
  if (!report) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Report not found', 404);
  }

  const downloadUrl = await getPrivateDownloadUrl(report.storedFilePath, 300);
  return {
    downloadUrl,
    filename: report.filename
  };
}

/**
 * Lists reports for a project with owner scoping
 */
export async function listProjectReports(projectId, ownerId) {
  const project = await Project.findOne({ _id: projectId, ownerId });
  if (!project) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);
  }

  const reports = await Report.find({ projectId, ownerId }).sort({ generatedAt: -1 });
  return reports;
}
