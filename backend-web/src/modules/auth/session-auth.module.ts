import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from './entities/auth-session.entity.js';
import { RolesGuard } from './roles.guard.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { SessionAuthService } from './session-auth.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuthSession])],
  providers: [SessionAuthService, SessionAuthGuard, RolesGuard],
  exports: [SessionAuthService, SessionAuthGuard, RolesGuard],
})
export class SessionAuthModule {}
