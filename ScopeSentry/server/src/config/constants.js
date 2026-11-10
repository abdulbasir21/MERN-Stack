// Global Constants & Enums for ScopeSentry (Source: MASTER_PROMPT.md)

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_FILE: 'UNSUPPORTED_FILE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

export const PROJECT_TYPES = [
  'commercial_building',
  'residential_development',
  'office_renovation',
  'other'
];

export const PROJECT_STATUSES = ['active', 'archived'];

export const DOCUMENT_CATEGORIES = [
  'original_contract',
  'original_specification',
  'revised_specification',
  'change_request',
  'meeting_notes',
  'supporting_document'
];

export const DOCUMENT_PROCESSING_STATUSES = [
  'pending',
  'extracting',
  'extracted',
  'indexing',
  'ready',
  'failed'
];

export const INVESTIGATION_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed'
];

export const CHANGE_CATEGORIES = [
  'quantity_changed',
  'material_changed',
  'specification_changed',
  'requirement_added',
  'requirement_removed',
  'date_changed',
  'cost_changed',
  'other'
];

export const REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'needs_further_review'
];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];

export const AUDIT_ACTION_TYPES = ['status_change', 'comment', 'price_override'];

export const PERMISSIONS = {
  DEMO_READ: 'demo:read',
  DEMO_RUN: 'demo:run',
  PROJECT_CREATE: 'project:create',
  PROJECT_READ_OWN: 'project:read:own',
  PROJECT_UPDATE_OWN: 'project:update:own',
  PROJECT_DELETE_OWN: 'project:delete:own',
  DOCUMENT_UPLOAD_OWN: 'document:upload:own',
  DOCUMENT_READ_OWN: 'document:read:own',
  DOCUMENT_DELETE_OWN: 'document:delete:own',
  INVESTIGATION_CREATE_OWN: 'investigation:create:own',
  INVESTIGATION_READ_OWN: 'investigation:read:own',
  INVESTIGATION_DELETE_OWN: 'investigation:delete:own',
  FINDING_REVIEW_OWN: 'finding:review:own',
  REPORT_CREATE_OWN: 'report:create:own',
  REPORT_READ_OWN: 'report:read:own',
  DASHBOARD_READ_OWN: 'dashboard:read:own',
  SETTINGS_UPDATE_OWN: 'settings:update:own'
};
