import { Project } from '../models/Project.js';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { indexDocumentChunks } from '../services/indexingService.js';
import { connectDatabase, disconnectDatabase } from './connection.js';

/**
 * Idempotent seed script for the three fictional demo construction projects (MASTER_PROMPT section 13)
 * All demo entities are marked isDemo: true and ownerId: null.
 * Never modifies or deletes any user data.
 */
export async function seedDemoData() {
  console.log('[Seed] Seeding fictional demo construction data...');

  // 1. Clean existing demo data only
  const demoProjects = await Project.find({ isDemo: true }, '_id');
  const demoProjectIds = demoProjects.map((p) => p._id);

  if (demoProjectIds.length > 0) {
    await DocumentChunk.deleteMany({ projectId: { $in: demoProjectIds } });
    await Document.deleteMany({ projectId: { $in: demoProjectIds } });
    await Project.deleteMany({ _id: { $in: demoProjectIds } });
  }

  // 2. Demo Project 1: Commercial Building (The Canonical Spec/Contract Case)
  const commercialProject = await Project.create({
    ownerId: null,
    name: 'Commercial Plaza Tower (Demo)',
    description: '32-story downtown commercial office tower with multi-tenant retail podium.',
    projectType: 'commercial_building',
    location: 'Denver, CO',
    budget: 85000000,
    currency: 'USD',
    startDate: '2026-03-01',
    expectedCompletionDate: '2028-11-30',
    status: 'active',
    isDemo: true
  });

  const commOrigDoc = await Document.create({
    ownerId: null,
    projectId: commercialProject._id,
    category: 'original_specification',
    originalFilename: 'Plaza_Spec_Rev0_Original.pdf',
    storedFileId: 'demo_file_comm_orig',
    storedFilePath: '/demo/Plaza_Spec_Rev0_Original.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12400,
    processingStatus: 'ready',
    extractedText: `SECTION 08 51 13 - ALUMINUM WINDOWS
PART 1 - GENERAL
1.1 SUMMARY
A. Section includes exterior commercial window assemblies and glazing.

PART 2 - PRODUCTS
2.1 WINDOW ASSEMBLIES
A. Glazing specification: Standard double-pane anodized aluminum frame assemblies.
B. Quantity: Install 20 standard windows across exterior retail storefront bays.
C. Subcontractor baseline unit price: $450.00 per unit installed.

PART 3 - EXECUTION
3.1 SCHEDULE
A. Substantial completion milestone for building envelope: 2026-06-01.`,
    isDemo: true
  });

  const commRevDoc = await Document.create({
    ownerId: null,
    projectId: commercialProject._id,
    category: 'revised_specification',
    originalFilename: 'Plaza_Spec_Rev1_IssuedForChange.pdf',
    storedFileId: 'demo_file_comm_rev',
    storedFilePath: '/demo/Plaza_Spec_Rev1_IssuedForChange.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 13100,
    processingStatus: 'ready',
    extractedText: `SECTION 08 51 13 - ALUMINUM WINDOWS
PART 1 - GENERAL
1.1 SUMMARY
A. Section includes exterior commercial window assemblies and upgraded thermal barrier glazing.

PART 2 - PRODUCTS
2.1 WINDOW ASSEMBLIES
A. Glazing specification: Triple-glazed premium thermal insulated structural aluminum assemblies.
B. Quantity: Install 32 premium insulated windows across exterior retail and mezzanine bays.
C. Unit price: $450.00 per unit installed baseline.

PART 3 - EXECUTION
3.1 SCHEDULE
A. Revised substantial completion milestone for building envelope: 2026-06-15.`,
    isDemo: true
  });

  const commSupportDoc = await Document.create({
    ownerId: null,
    projectId: commercialProject._id,
    category: 'meeting_notes',
    originalFilename: 'OAC_Meeting_Minutes_Week12.docx',
    storedFileId: 'demo_file_comm_sup',
    storedFilePath: '/demo/OAC_Meeting_Minutes_Week12.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 8900,
    processingStatus: 'ready',
    extractedText: `OWNER ARCHITECT CONTRACTOR (OAC) MEETING MINUTES
Date: 2026-04-10
Attendees: Owner Representative, Project Architect, General Contractor PM

Discussion Item 4.2 - Glazing Upgrade:
The Architect presented proposal for 12 additional window units to improve daylighting.
Status: Change Order #3 submitted for review and awaiting signature. Not yet signed.`,
    isDemo: true
  });

  // Index chunks in parallel for maximum performance
  await Promise.all([
    indexDocumentChunks(null, commercialProject._id, commOrigDoc._id, { text: commOrigDoc.extractedText }),
    indexDocumentChunks(null, commercialProject._id, commRevDoc._id, { text: commRevDoc.extractedText }),
    indexDocumentChunks(null, commercialProject._id, commSupportDoc._id, { text: commSupportDoc.extractedText })
  ]);

  // 3. Demo Project 2: Residential Development
  const residentialProject = await Project.create({
    ownerId: null,
    name: 'Riverside Residential Estates (Demo)',
    description: '48-unit master planned townhome community along the South River corridor.',
    projectType: 'residential_development',
    location: 'Austin, TX',
    budget: 32000000,
    currency: 'USD',
    startDate: '2026-05-01',
    expectedCompletionDate: '2027-10-31',
    status: 'active',
    isDemo: true
  });

  const resOrigDoc = await Document.create({
    ownerId: null,
    projectId: residentialProject._id,
    category: 'original_contract',
    originalFilename: 'Riverside_Prime_Contract.pdf',
    storedFileId: 'demo_file_res_orig',
    storedFilePath: '/demo/Riverside_Prime_Contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 15400,
    processingStatus: 'ready',
    extractedText: `ARTICLE 4 - TIMBER AND FRAMING SPECIFICATION
Clause 4.1: Contractor shall supply engineered Douglas Fir structural timber for all 48 residential framing shells.
Total baseline units: 48 framing packages.
Unit rate: $12000.00 per residential frame package.
Delivery milestone: 2026-08-01.`,
    isDemo: true
  });

  const resRevDoc = await Document.create({
    ownerId: null,
    projectId: residentialProject._id,
    category: 'change_request',
    originalFilename: 'Change_Request_02_Framing_Material.pdf',
    storedFileId: 'demo_file_res_rev',
    storedFilePath: '/demo/Change_Request_02_Framing_Material.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 11200,
    processingStatus: 'ready',
    extractedText: `CHANGE REQUEST #02 - STRUCTURAL MATERIAL SUBSTITUTION
Clause 4.1: Contractor requested substitution of timber framing to heavy-gauge cold-formed steel framing.
Total framing units: 48 framing packages.
Unit rate: $14500.00 per frame package.
Revised delivery milestone: 2026-08-25.`,
    isDemo: true
  });

  await Promise.all([
    indexDocumentChunks(null, residentialProject._id, resOrigDoc._id, { text: resOrigDoc.extractedText }),
    indexDocumentChunks(null, residentialProject._id, resRevDoc._id, { text: resRevDoc.extractedText })
  ]);

  // 4. Demo Project 3: Office Renovation
  const officeProject = await Project.create({
    ownerId: null,
    name: 'Metro Tech Hub Renovation (Demo)',
    description: 'Corporate headquarters tenant improvement across floors 4 through 7.',
    projectType: 'office_renovation',
    location: 'Seattle, WA',
    budget: 14500000,
    currency: 'USD',
    startDate: '2026-02-15',
    expectedCompletionDate: '2026-09-30',
    status: 'active',
    isDemo: true
  });

  const officeOrigDoc = await Document.create({
    ownerId: null,
    projectId: officeProject._id,
    category: 'original_specification',
    originalFilename: 'TechHub_Interior_Fitout_Spec.pdf',
    storedFileId: 'demo_file_off_orig',
    storedFilePath: '/demo/TechHub_Interior_Fitout_Spec.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 9800,
    processingStatus: 'ready',
    extractedText: `DIVISION 09 - FINISHES
Section 09 90 00: Apply decorative wall covering acoustic panels in all 16 executive conference rooms.
Quantity: 16 conference room installations.
Unit price: $2200.00 per room.`,
    isDemo: true
  });

  const officeRevDoc = await Document.create({
    ownerId: null,
    projectId: officeProject._id,
    category: 'revised_specification',
    originalFilename: 'TechHub_Fitout_Addendum_1.pdf',
    storedFileId: 'demo_file_off_rev',
    storedFilePath: '/demo/TechHub_Fitout_Addendum_1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 10400,
    processingStatus: 'ready',
    extractedText: `DIVISION 26 - ELECTRICAL
Install 1 Emergency Generator standby power system with dedicated rooftop fuel storage.
Quantity: 1 unit.
Unit price: $85000.00.
Note: Decorative wall covering in Section 09 90 00 has been removed from scope.`,
    isDemo: true
  });

  await Promise.all([
    indexDocumentChunks(null, officeProject._id, officeOrigDoc._id, { text: officeOrigDoc.extractedText }),
    indexDocumentChunks(null, officeProject._id, officeRevDoc._id, { text: officeRevDoc.extractedText })
  ]);

  console.log('[Seed] Demo data seeding completed successfully! (3 projects, 7 documents indexed)');

  return {
    commercialProjectId: commercialProject._id,
    residentialProjectId: residentialProject._id,
    officeProjectId: officeProject._id
  };
}

// Standalone execution script
if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedDemoData();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]:', err);
      process.exit(1);
    }
  })();
}
