// export const USER_STATUS = {
//   ACTIVE: 'active',
//   INACTIVE: 'inactive',
//   SUSPENDED: 'suspended',
//   BANNED: 'banned',
// } as const;
//
// export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export enum USER_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING = 'pending',
}
