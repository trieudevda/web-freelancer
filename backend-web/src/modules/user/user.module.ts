import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionAuthModule } from '../auth/session-auth.module.js';
import { User } from './entities/user.entity.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { ManagedUsersService } from './managed-users.service.js';
import { BootstrapSuperadminService } from './bootstrap-superadmin.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SessionAuthModule],
  controllers: [UserController, AdminUsersController],
  providers: [UserService, ManagedUsersService, BootstrapSuperadminService],
  exports: [UserService],
})
export class UserModule {}
