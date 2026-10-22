export type UserRole = 'superadmin' | 'staff';

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}
