import type { Request } from 'express';
import type { UserRole } from '../../config/constants/user/user-role.constants.js';

export interface AuthContext {
  userId: number;
  sessionId: string;
  authVersion: number;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}

export interface ClientDeviceInfo {
  deviceId?: string;
  deviceName?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}
