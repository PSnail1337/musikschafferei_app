import type { UserRole, UserType } from './constants';

// Role hierarchy: higher index = more permissions
const ROLE_RANK: Record<UserRole, number> = {
  'main-master': 4,
  'master':      3,
  'admin':       2,
  'mitglied':    1,
};

/** Returns true if `role` has at least the permissions of `minRole` */
export function hasRole(role: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export const isMainMaster = (role: UserRole) => role === 'main-master';
export const isMaster     = (role: UserRole) => hasRole(role, 'master');
export const isAdmin      = (role: UserRole) => hasRole(role, 'admin');

/** Schüler can only access Nutzungsbedingungen and Support */
export function canAccessFeature(userType: UserType, feature: string): boolean {
  if (userType !== 'schüler') return true;
  return ['terms', 'support'].includes(feature);
}

/** Label helpers for display */
export const ROLE_LABELS: Record<UserRole, string> = {
  'main-master': 'Main-Master',
  'master':      'Master',
  'admin':       'Admin',
  'mitglied':    'Mitglied',
};

export const TYPE_LABELS: Record<UserType, string> = {
  'abo-kunde':      'Abo-Kunde',
  'lehrer':         'Lehrer',
  'schüler':        'Schüler',
  'sondermitglied': 'Sondermitglied',
};
