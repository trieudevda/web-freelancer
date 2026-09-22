import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from './entities/auth-session.entity';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionAuthService } from './session-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthSession])],
  providers: [SessionAuthService, SessionAuthGuard],
  exports: [SessionAuthService, SessionAuthGuard],
})
export class SessionAuthModule {}
