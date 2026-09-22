import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { SessionAuthModule } from './session-auth.module';

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
