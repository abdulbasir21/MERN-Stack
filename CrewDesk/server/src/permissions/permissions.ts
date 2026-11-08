import { Role } from '@prisma/client';

export type Permission =
  // Users & Roles
  | 'employee:create'
  | 'employee:update'
  | 'employee:deactivate'
  | 'employee:list'
  | 'manager:create'
  | 'role:change'
  // Departments
  | 'department:manage'
  // Profile (all roles own)
  | 'profile:update-own'
  | 'avatar:update-own'
  // Clients
  | 'client:read'
  | 'client:manage'
  // Projects
  | 'project:read'
  | 'project:create'
  | 'project:manage'
  | 'milestone:manage'
  | 'team:manage'
  // Tasks
  | 'task:read-own'
  | 'task:manage'
  | 'task:update-own'
  | 'comment:create'
  // Attendance
  | 'attendance:check'
  | 'attendance:read-all'
  | 'attendance:edit'
  // Leave
  | 'leave:request'
  | 'leave:read-own'
  | 'leave:approve'
  | 'leave:override'
  | 'leave:balance-manage'
  | 'leave-type:manage'
  // Finance
  | 'expense:manage'
  | 'invoice:manage'
  | 'payment:manage'
  | 'finance:report'
  | 'finance:read-budget'
  // Inventory
  | 'inventory:manage'
  | 'stock:move'
  | 'asset:assign'
  | 'asset:read-own'
  | 'inventory:report'
  // Other / System
  | 'notification:read-own'
  | 'audit:read'
  | 'settings:manage'
  | 'report:hr'
  | 'report:project'
  | 'report:all';

export const ALL_PERMISSIONS: Permission[] = [
  'employee:create', 'employee:update', 'employee:deactivate', 'employee:list',
  'manager:create', 'role:change', 'department:manage',
  'profile:update-own', 'avatar:update-own',
  'client:read', 'client:manage',
  'project:read', 'project:create', 'project:manage', 'milestone:manage', 'team:manage',
  'task:read-own', 'task:manage', 'task:update-own', 'comment:create',
  'attendance:check', 'attendance:read-all', 'attendance:edit',
  'leave:request', 'leave:read-own', 'leave:approve', 'leave:override', 'leave:balance-manage', 'leave-type:manage',
  'expense:manage', 'invoice:manage', 'payment:manage', 'finance:report', 'finance:read-budget',
  'inventory:manage', 'stock:move', 'asset:assign', 'asset:read-own', 'inventory:report',
  'notification:read-own', 'audit:read', 'settings:manage',
  'report:hr', 'report:project', 'report:all',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,

  HR_MANAGER: [
    'profile:update-own', 'avatar:update-own', 'notification:read-own',
    'employee:create', 'employee:update', 'employee:deactivate', 'employee:list',
    'department:manage',
    'attendance:check', 'attendance:read-all', 'attendance:edit',
    'leave:request', 'leave:read-own', 'leave:approve', 'leave:balance-manage', 'leave-type:manage',
    'report:hr',
  ],

  PROJECT_MANAGER: [
    'profile:update-own', 'avatar:update-own', 'notification:read-own',
    'attendance:check', 'leave:request', 'leave:read-own',
    'client:read', 'client:manage',
    'project:read', 'project:create', 'project:manage', 'milestone:manage', 'team:manage',
    'task:manage', 'task:read-own', 'task:update-own', 'comment:create',
    'finance:read-budget',
    'report:project',
  ],

  FINANCE_MANAGER: [
    'profile:update-own', 'avatar:update-own', 'notification:read-own',
    'attendance:check', 'leave:request', 'leave:read-own',
    'client:read',
    'project:read',
    'finance:read-budget',
    'expense:manage', 'invoice:manage', 'payment:manage', 'finance:report',
  ],

  INVENTORY_MANAGER: [
    'profile:update-own', 'avatar:update-own', 'notification:read-own',
    'attendance:check', 'leave:request', 'leave:read-own',
    'inventory:manage', 'stock:move', 'asset:assign', 'asset:read-own', 'inventory:report',
  ],

  EMPLOYEE: [
    'profile:update-own', 'avatar:update-own', 'notification:read-own',
    'attendance:check',
    'leave:request', 'leave:read-own',
    'project:read', // scope: assigned projects only
    'task:read-own', 'task:update-own', 'comment:create',
    'asset:read-own',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}
