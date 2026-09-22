import type { Request } from 'express';

export interface AuthContext {
  userId: number;
  sessionId: string;
  authVersion: number;
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
