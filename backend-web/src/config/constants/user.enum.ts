export const USER ={
  ROLE = {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest'
  },
  PERMISSION = {
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
  STATUS = {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended', // khóa tạm thời
    BANNED = 'banned', // khóa vĩnh viễn
 }
} as const;
export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  [UserStatus.PENDING]: 'Chờ xác thực',
  [UserStatus.ACTIVE]: 'Đang hoạt động',
  [UserStatus.INACTIVE]: 'Ngừng hoạt động',
  [UserStatus.SUSPENDED]: 'Tạm khóa',
};
