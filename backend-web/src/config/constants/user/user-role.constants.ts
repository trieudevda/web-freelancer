export const USER_ROLE = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
