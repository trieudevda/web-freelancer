// backend-web/src/modules/user/user.controller.ts

import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserService } from './user.service.js';

@Controller('user')
@UseGuards(SessionAuthGuard)
@ApiTags('users')
@ApiCookieAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async me(
    @Req()
    request: AuthenticatedRequest,
  ) {
    const user = await this.userService.findById(request.auth.userId);

    return this.userService.toPublicUser(user);
  }
  @Patch('me')
  @ApiOperation({ summary: 'Update profile using optimistic concurrency' })
  async updateMe(
    @Req()
    request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.userService.updateProfileOptimistic(
      request.auth.userId,
      dto,
    );

    return this.userService.toPublicUser(user);
  }
}
