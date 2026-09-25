import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  STAFF_ROLES,
  USER_ROLE,
  type UserRole,
} from '../../config/constants/user/user-role.constants.js';
import { USER_STATUS } from '../../config/constants/user/user-status.js';
import type { AuthContext } from '../auth/auth.types.js';
import { hashPassword } from '../auth/password.util.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { SearchManagedUsersDto } from './dto/search-managed-users.dto.js';
import type {
  UpdateManagedUserDto,
  UpdateStaffDto,
} from './dto/update-managed-user.dto.js';
import { User } from './entities/user.entity.js';
import { UserService } from './user.service.js';

type Directory = 'staff' | 'customers';

@Injectable()
export class ManagedUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
  ) {}

  async search(directory: Directory, query: SearchManagedUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const roles: readonly UserRole[] =
      directory === 'staff' ? STAFF_ROLES : [USER_ROLE.USER];
    const builder = this.userRepository
      .createQueryBuilder('user')
      .where('user.role IN (:...roles)', { roles });

    if (query.status) {
      builder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.q?.trim()) {
      const keyword = `%${this.escapeLike(query.q.trim().toLowerCase())}%`;
      builder.andWhere(
        `(
          LOWER(user.email) LIKE :keyword ESCAPE '!'
          OR LOWER(user.first_name) LIKE :keyword ESCAPE '!'
          OR LOWER(user.last_name) LIKE :keyword ESCAPE '!'
          OR LOWER(CONCAT(user.first_name, ' ', user.last_name)) LIKE :keyword ESCAPE '!'
          OR user.phone LIKE :keyword ESCAPE '!'
        )`,
        { keyword },
      );
    }

    const [users, total] = await builder
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: users.map((user) => this.userService.toPublicUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createStaff(actor: AuthContext, dto: CreateStaffDto) {
    this.assertStaffRole(dto.role);
    this.assertCanManageStaffRole(actor.role, dto.role);

    const password = await hashPassword(dto.password);
    const user = this.userRepository.create({
      firstname: dto.firstname.trim(),
      lastname: dto.lastname.trim(),
      phone: dto.phone.trim(),
      email: dto.email.trim().toLowerCase(),
      address: dto.address.trim(),
      password,
      authVersion: 1,
      role: dto.role,
      status: USER_STATUS.ACTIVE,
    });

    try {
      return this.userService.toPublicUser(
        await this.userRepository.save(user),
      );
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('Email đã được sử dụng');
      }
      throw error;
    }
  }

  updateStaff(actor: AuthContext, id: number, dto: UpdateStaffDto) {
    return this.updateManaged('staff', actor, id, dto);
  }

  updateCustomer(actor: AuthContext, id: number, dto: UpdateManagedUserDto) {
    return this.updateManaged('customers', actor, id, dto);
  }

  removeStaff(actor: AuthContext, id: number, version: number) {
    return this.removeManaged('staff', actor, id, version);
  }

  removeCustomer(actor: AuthContext, id: number, version: number) {
    return this.removeManaged('customers', actor, id, version);
  }

  private async updateManaged(
    directory: Directory,
    actor: AuthContext,
    id: number,
    dto: UpdateStaffDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const target = await this.findManagedForUpdate(manager, directory, id);
      this.assertVersion(target, dto.version);
      this.assertNotSelf(actor, target);

      if (directory === 'staff') {
        this.assertCanManageStaffRole(actor.role, target.role);
        if (dto.role !== undefined) {
          this.assertStaffRole(dto.role);
          this.assertCanManageStaffRole(actor.role, dto.role);
        }
      }

      const nextRole = dto.role ?? target.role;
      const nextStatus = dto.status ?? target.status;

      if (
        target.role === USER_ROLE.SUPERADMIN &&
        (nextRole !== USER_ROLE.SUPERADMIN || nextStatus !== USER_STATUS.ACTIVE)
      ) {
        await this.assertAnotherActiveSuperadmin(manager, target.id);
      }

      const securityChanged =
        nextRole !== target.role || nextStatus !== target.status;

      if (dto.firstname !== undefined) target.firstname = dto.firstname.trim();
      if (dto.lastname !== undefined) target.lastname = dto.lastname.trim();
      if (dto.phone !== undefined) target.phone = dto.phone.trim();
      if (dto.address !== undefined) target.address = dto.address.trim();
      if (dto.status !== undefined) target.status = dto.status;
      if (dto.role !== undefined) target.role = dto.role;
      if (securityChanged) target.authVersion += 1;

      const updated = await manager.getRepository(User).save(target);
      return this.userService.toPublicUser(updated);
    });
  }

  private async removeManaged(
    directory: Directory,
    actor: AuthContext,
    id: number,
    version: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const target = await this.findManagedForUpdate(manager, directory, id);
      this.assertVersion(target, version);
      this.assertNotSelf(actor, target);

      if (directory === 'staff') {
        this.assertCanManageStaffRole(actor.role, target.role);
      }

      if (target.role === USER_ROLE.SUPERADMIN) {
        await this.assertAnotherActiveSuperadmin(manager, target.id);
      }

      target.status = USER_STATUS.INACTIVE;
      target.authVersion += 1;
      target.deletedAt = new Date();
      await manager.getRepository(User).save(target);

      return { id: target.id, deleted: true };
    });
  }

  private async findManagedForUpdate(
    manager: EntityManager,
    directory: Directory,
    id: number,
  ) {
    const roles: readonly UserRole[] =
      directory === 'staff' ? STAFF_ROLES : [USER_ROLE.USER];
    const target = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .andWhere('user.role IN (:...roles)', { roles })
      .andWhere('user.deletedAt IS NULL')
      .setLock('pessimistic_write')
      .getOne();

    if (!target) {
      throw new NotFoundException(
        directory === 'staff'
          ? 'Không tìm thấy tài khoản nhân sự'
          : 'Không tìm thấy tài khoản khách hàng',
      );
    }
    return target;
  }

  private assertVersion(user: User, version: number) {
    if (user.version !== version) {
      throw new ConflictException(
        'Dữ liệu đã được thay đổi bởi một phiên khác. Vui lòng tải lại.',
      );
    }
  }

  private assertNotSelf(actor: AuthContext, target: User) {
    if (actor.userId === target.id) {
      throw new ForbiddenException(
        'Không thể thay đổi vai trò, trạng thái hoặc xóa chính tài khoản đang đăng nhập',
      );
    }
  }

  private assertStaffRole(role: UserRole) {
    if (!(STAFF_ROLES as readonly UserRole[]).includes(role)) {
      throw new BadRequestException('Vai trò không thuộc nhóm nhân sự');
    }
  }

  private assertCanManageStaffRole(actorRole: UserRole, targetRole: UserRole) {
    if (actorRole === USER_ROLE.SUPERADMIN) return;
    if (
      actorRole !== USER_ROLE.ADMIN ||
      ![USER_ROLE.EDITOR, USER_ROLE.SALES].includes(
        targetRole as typeof USER_ROLE.EDITOR | typeof USER_ROLE.SALES,
      )
    ) {
      throw new ForbiddenException('Bạn không có quyền quản lý vai trò này');
    }
  }

  private async assertAnotherActiveSuperadmin(
    manager: EntityManager,
    excludedId: number,
  ) {
    const active = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.role = :role', { role: USER_ROLE.SUPERADMIN })
      .andWhere('user.status = :status', { status: USER_STATUS.ACTIVE })
      .andWhere('user.deletedAt IS NULL')
      .setLock('pessimistic_write')
      .getMany();

    if (!active.some((user) => user.id !== excludedId)) {
      throw new ConflictException(
        'Hệ thống phải luôn còn ít nhất một superadmin đang hoạt động',
      );
    }
  }

  private escapeLike(value: string) {
    return value.replace(/[!%_]/g, '!$&');
  }

  private isDuplicateEntry(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'driverError' in error &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'code' in error.driverError &&
      error.driverError.code === 'ER_DUP_ENTRY'
    );
  }
}
