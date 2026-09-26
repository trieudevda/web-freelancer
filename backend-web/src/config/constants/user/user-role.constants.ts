export const USER_ROLE = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  SALES: 'sales',
  USER: 'user',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const STAFF_ROLES = [
  USER_ROLE.SUPERADMIN,
  USER_ROLE.ADMIN,
  USER_ROLE.EDITOR,
  USER_ROLE.SALES,
] as const satisfies readonly UserRole[];
