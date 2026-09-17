import { USER_STATUS } from './user/user-status';

export const USER = {
  ROLE: {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    USER: 'user',
    GUEST: 'guest',
  },
  PERMISSION: {
    USER: {
      READ: 'user:read',
      CREATE: 'user:create',
      UPDATE: 'user:update',
      DELETE: 'user:delete',
    },

    ROLE: {
      READ: 'role:read',
      CREATE: 'role:create',
      UPDATE: 'role:update',
      DELETE: 'role:delete',
    },
  },
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended', // khóa tạm thời
    BANNED: 'banned', // khóa vĩnh viễn
  },
} as const;
export const USER_STATUS_LABEL: Record<USER_STATUS, string> = {
  [USER_STATUS.PENDING]: 'Chờ xác thực',
  [USER_STATUS.ACTIVE]: 'Đang hoạt động',
  [USER_STATUS.INACTIVE]: 'Ngừng hoạt động',
  [USER_STATUS.SUSPENDED]: 'Tạm khóa',
  [USER_STATUS.BANNED]: 'Khóa vĩnh viễn',
};
