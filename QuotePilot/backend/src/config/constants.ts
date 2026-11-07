export const SERVICE_CATEGORIES = [
  'Web Development',
  'Interior Design',
  'Logo Design',
  'Accounting',
  'Digital Marketing',
  'Content Writing',
  'Architecture & 3D',
  'App Development'
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

export const USER_ROLES = ['customer', 'company_admin', 'platform_admin'] as const;
export type UserRole = typeof USER_ROLES[number];

export const COMPANY_STATUSES = ['pending', 'approved', 'rejected', 'blocked'] as const;
export type CompanyStatus = typeof COMPANY_STATUSES[number];

export const INQUIRY_STATUSES = [
  'submitted',
  'in_discussion',
  'quoted',
  'accepted',
  'rejected',
  'in_progress',
  'completed'
] as const;
export type InquiryStatus = typeof INQUIRY_STATUSES[number];

export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const;
export type QuotationStatus = typeof QUOTATION_STATUSES[number];

export const DEFAULT_CHECKLIST = [
  'What the project is and its primary goal',
  'Budget range or expected investment',
  'Timeline, preferred deadline, or start date'
] as const;

export const LIMITS = {
  MAX_CHECKLIST_ITEMS: 15,
  MAX_PORTFOLIO_ITEMS: 20,
  MAX_INQUIRY_DESCRIPTION: 4000,
  MIN_INQUIRY_DESCRIPTION: 20,
  MAX_MESSAGE_TEXT: 2000,
  MAX_WORK_INCLUDED: 5000,
  MIN_WORK_INCLUDED: 10,
  MAX_REJECTION_REASON: 500,
  MIN_REJECTION_REASON: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
} as const;
