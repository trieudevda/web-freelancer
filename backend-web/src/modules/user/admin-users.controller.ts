import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { SearchManagedUsersDto } from './dto/search-managed-users.dto.js';
import {
  DeleteManagedUserDto,
  UpdateManagedUserDto,
  UpdateStaffDto,
} from './dto/update-managed-user.dto.js';
import { ManagedUsersService } from './managed-users.service.js';

@Controller('admin/users')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(USER_ROLE.SUPERADMIN, USER_ROLE.ADMIN)
@ApiTags('admin-users')
@ApiCookieAuth('access-token')
export class AdminUsersController {
  constructor(private readonly managedUsers: ManagedUsersService) {}

  @Get('staff')
  @ApiOperation({ summary: 'List staff accounts' })
  searchStaff(@Query() query: SearchManagedUsersDto) {
    return this.managedUsers.search('staff', query);
  }

  @Post('staff')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a staff account' })
  createStaff(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateStaffDto,
  ) {
    return this.managedUsers.createStaff(request.auth, dto);
  }

  @Patch('staff/:id')
  @ApiOperation({ summary: 'Update staff using optimistic concurrency' })
  updateStaff(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.managedUsers.updateStaff(request.auth, id, dto);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Soft-delete a staff account and revoke sessions' })
  removeStaff(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteManagedUserDto,
  ) {
    return this.managedUsers.removeStaff(request.auth, id, query.version);
  }

  @Get('customers')
  @ApiOperation({ summary: 'List customer accounts (role user)' })
  searchCustomers(@Query() query: SearchManagedUsersDto) {
    return this.managedUsers.search('customers', query);
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update a customer using optimistic concurrency' })
  updateCustomer(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManagedUserDto,
  ) {
    return this.managedUsers.updateCustomer(request.auth, id, dto);
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: 'Soft-delete a customer and revoke sessions' })
  removeCustomer(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteManagedUserDto,
  ) {
    return this.managedUsers.removeCustomer(request.auth, id, query.version);
  }
}
