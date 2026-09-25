import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { USER_STATUS } from '../../config/constants/user/user-status.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { User } from './entities/user.entity.js';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';

export interface CreateAuthUserInput {
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  address: string;
  passwordHash: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.userRepository;
  }

  async createForAuth(
    input: CreateAuthUserInput,
    manager?: EntityManager,
  ): Promise<User> {
    const repository = this.getRepository(manager);

    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await repository.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const user = repository.create({
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      phone: input.phone.trim(),
      email: normalizedEmail,
      address: input.address.trim(),
      password: input.passwordHash,
      status: USER_STATUS.ACTIVE,
      authVersion: 1,
      role: USER_ROLE.USER,
    });

    try {
      return await repository.save(user);
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('Email đã được sử dụng');
      }

      throw error;
    }
  }

  async findByEmailWithPassword(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    const repository = this.getRepository(manager);

    return repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: email.trim().toLowerCase(),
      })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findByEmailWithPasswordForUpdate(
    email: string,
    manager: EntityManager,
  ): Promise<User | null> {
    return manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: email.trim().toLowerCase(),
      })
      .andWhere('user.deletedAt IS NULL')
      .setLock('pessimistic_write')
      .getOne();
  }

  async findWithPasswordForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<User | null> {
    return manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .setLock('pessimistic_write')
      .getOne();
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  async updateProfileOptimistic(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<User> {
    const changes: Partial<User> = {};

    if (dto.firstname !== undefined) {
      changes.firstname = dto.firstname.trim();
    }

    if (dto.lastname !== undefined) {
      changes.lastname = dto.lastname.trim();
    }

    if (dto.phone !== undefined) {
      changes.phone = dto.phone.trim();
    }

    if (dto.address !== undefined) {
      changes.address = dto.address.trim();
    }

    if (Object.keys(changes).length === 0) {
      return this.findById(userId);
    }

    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        ...changes,
        version: () => 'version + 1',
      })
      .where('id = :userId', {
        userId,
      })
      .andWhere('version = :version', {
        version: dto.version,
      })
      .andWhere('deleted_at IS NULL')
      .execute();

    if (result.affected !== 1) {
      const exists = await this.userRepository.exists({
        where: {
          id: userId,
        },
      });

      if (!exists) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      throw new ConflictException(
        'Dữ liệu đã được thay đổi bởi một phiên khác. Vui lòng tải lại.',
      );
    }

    return this.findById(userId);
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      email: user.email,
      address: user.address,
      status: user.status,
      role: user.role,
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isDuplicateEntry(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const value = error as {
      driverError?: {
        code?: string;
      };
    };

    return value.driverError?.code === 'ER_DUP_ENTRY';
  }
}
