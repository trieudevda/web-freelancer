import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../config/constants/user/user-role.constants.js';

export const ROLES_METADATA_KEY = 'allowed_roles';

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_METADATA_KEY, roles);
