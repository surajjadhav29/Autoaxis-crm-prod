/** Local users — login works without backend / MongoDB */

export const DEMO_USERS = [
  {
    id: 'demo-admin-1',
    fullName: 'System Admin',
    email: 'admin@autoaxis.com',
    username: 'admin',
    password: 'admin123',
    role: 'superadmin',
    isActive: true,
  },
  {
    id: 'demo-staff-1',
    fullName: 'Demo Staff',
    email: 'staff@autoaxis.com',
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    isActive: true,
  },
];

export const DEMO_TOKEN_PREFIX = 'demo-local-';

export function findDemoUser(login, password) {
  const key = login.trim().toLowerCase();
  return DEMO_USERS.find(
    (u) =>
      u.isActive &&
      u.password === password &&
      (u.email === key || u.username === key)
  );
}

export function isDemoToken(token) {
  return token?.startsWith(DEMO_TOKEN_PREFIX);
}

export function toSessionUser(demoUser) {
  return {
    id: demoUser.id,
    fullName: demoUser.fullName,
    email: demoUser.email,
    username: demoUser.username,
    role: demoUser.role,
    isActive: demoUser.isActive,
    isDemo: true,
  };
}

export function createDemoToken(userId) {
  return `${DEMO_TOKEN_PREFIX}${userId}`;
}

export function getDemoUsersList() {
  return DEMO_USERS.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    username: u.username,
    role: u.role,
    isActive: u.isActive,
    isDemo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

/** Staff-only rows for the Staff Users admin table */
export function getDemoStaffUsers() {
  return getDemoUsersList().filter((u) => u.role === 'staff');
}
