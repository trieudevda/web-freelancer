import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module.js';
import { AuthController } from './auth.controller.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthService } from './auth.service.js';
import { AuthSession } from './entities/auth-session.entity.js';
import { SessionAuthModule } from './session-auth.module.js';

@Module({
  imports: [
    UserModule,

    TypeOrmModule.forFeature([AuthSession]),

    SessionAuthModule,
  ],

  controllers: [AuthController],

  providers: [AuthService, AuthCookieService],
})
export class AuthModule {}
