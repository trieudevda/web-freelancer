import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import { USER_STATUS } from '../../config/constants/user/user-status.js';
import { hashPassword } from '../auth/password.util.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class BootstrapSuperadminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapSuperadminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('BOOTSTRAP_SUPERADMIN_EMAIL');
    const password = this.config.get<string>('BOOTSTRAP_SUPERADMIN_PASSWORD');

    if (!email || !password) return;

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      withDeleted: true,
    });

    if (existing) {
      this.assertExistingSuperadmin(existing);
      this.logger.log({
        event: 'bootstrap_superadmin_already_exists',
        userId: existing.id,
      });
      return;
    }

    const user = this.userRepository.create({
      firstname: 'System',
      lastname: 'Administrator',
      phone: '0000000000',
      email: normalizedEmail,
      address: 'Bootstrap superadmin account',
      password: await hashPassword(password),
      authVersion: 1,
      role: USER_ROLE.SUPERADMIN,
      status: USER_STATUS.ACTIVE,
    });

    try {
      const created = await this.userRepository.save(user);
      this.logger.log({
        event: 'bootstrap_superadmin_created',
        userId: created.id,
      });
    } catch (error) {
      if (!this.isDuplicateEntry(error)) throw error;

      // Another application instance can win the unique-email race.
      const concurrent = await this.userRepository.findOne({
        where: { email: normalizedEmail },
        withDeleted: true,
      });
      if (!concurrent) throw error;
      this.assertExistingSuperadmin(concurrent);
    }
  }

  private assertExistingSuperadmin(user: User) {
    if (
      user.role !== USER_ROLE.SUPERADMIN ||
      user.status !== USER_STATUS.ACTIVE ||
      user.deletedAt
    ) {
      throw new Error(
        'BOOTSTRAP_SUPERADMIN_EMAIL already belongs to an account that is not an active superadmin',
      );
    }
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
