import { Project } from '../models/Project.js';
import { Investigation } from '../models/Investigation.js';
import { Finding } from '../models/Finding.js';
import { Report } from '../models/Report.js';

/**
 * Computes dashboard telemetry metrics live from the database (MASTER_PROMPT section 9)
 * All counts are dynamically computed on read and never stored.
 */
export async function getDashboardData(ownerId) {
  // 1. Project counts
  const [totalProjects, activeProjects] = await Promise.all([
    Project.countDocuments({ ownerId }),
    Project.countDocuments({ ownerId, status: 'active' })
  ]);

  // 2. Investigation counts & completed IDs
  const [totalInvestigations, completedInvestigations] = await Promise.all([
    Investigation.countDocuments({ ownerId }),
    Investigation.find({ ownerId, status: 'completed' }, '_id')
  ]);

  const completedIds = completedInvestigations.map((inv) => inv._id);

  // 3. Changes awaiting review in completed investigations
  let changesAwaitingReview = 0;
  if (completedIds.length > 0) {
    changesAwaitingReview = await Finding.countDocuments({
      ownerId,
      investigationId: { $in: completedIds },
      reviewStatus: { $in: ['pending', 'needs_further_review'] }
    });
  }

  // 4. Reports count
  const reportsGenerated = await Report.countDocuments({ ownerId });

  // 5. Recent projects (last 5)
  const recentProjects = await Project.find({ ownerId })
    .sort({ updatedAt: -1 })
    .limit(5);

  // 6. Recent investigations (last 5)
  const recentInvestigations = await Investigation.find({ ownerId })
    .populate('projectId', 'name currency projectType')
    .populate('originalDocumentId', 'originalFilename category')
    .populate('revisedDocumentId', 'originalFilename category')
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    metrics: {
      totalProjects,
      activeProjects,
      totalInvestigations,
      changesAwaitingReview,
      reportsGenerated
    },
    recentProjects,
    recentInvestigations
  };
}
