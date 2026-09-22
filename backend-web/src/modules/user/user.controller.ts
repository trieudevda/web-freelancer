// backend-web/src/modules/user/user.controller.ts

import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(SessionAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(
    @Req()
    request: AuthenticatedRequest,
  ) {
    const user = await this.userService.findById(request.auth.userId);

    return this.userService.toPublicUser(user);
  }
  @UseGuards(SessionAuthGuard)
  @Patch('me')
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
