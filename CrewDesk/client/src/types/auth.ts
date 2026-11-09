export type Role =
  | 'OWNER'
  | 'HR_MANAGER'
  | 'PROJECT_MANAGER'
  | 'FINANCE_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  phone?: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  isDemo?: boolean;
  department: string | { id: string; name: string } | null;
}
