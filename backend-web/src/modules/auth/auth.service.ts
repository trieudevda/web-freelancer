import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { USER_STATUS } from '../../config/constants/user/user-status';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import {
  createSessionToken,
  parseSessionToken,
  tokenHashMatches,
} from './auth-token.util';
import { AuthContext, ClientDeviceInfo } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthSession } from './entities/auth-session.entity';
import { hashPassword, verifyPassword } from './password.util';

@Injectable()
export class AuthService {
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    const accessSeconds = Number(
      config.get('AUTH_ACCESS_TTL_SECONDS', 15 * 60),
    );

    const refreshSeconds = Number(
      config.get('AUTH_REFRESH_TTL_SECONDS', 30 * 24 * 60 * 60),
    );

    this.accessTtlMs = accessSeconds * 1000;

    this.refreshTtlMs = refreshSeconds * 1000;
  }

  async register(dto: RegisterDto, device: ClientDeviceInfo) {
    const passwordHash = await hashPassword(dto.password);

    return this.dataSource.transaction(async (manager) => {
      const user = await this.userService.createForAuth(
        {
          firstname: dto.firstname,
          lastname: dto.lastname,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          passwordHash,
        },
        manager,
      );

      return this.createLoginSession(
        user,
        {
          ...device,
        },
        manager,
      );
    });
  }

  async login(dto: LoginDto, device: ClientDeviceInfo) {
    const user = await this.validateCredentials(dto.email, dto.password);

    return this.dataSource.transaction(async (manager) => {
      return this.createLoginSession(
        user,
        {
          ...device,
        },
        manager,
      );
    });
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const valid = await verifyPassword(password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ForbiddenException('Tài khoản không còn hoạt động');
    }

    return user;
  }

  async refresh(refreshToken: string) {
    const parsed = parseSessionToken(refreshToken);

    if (!parsed) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AuthSession);

      const session = await repository
        .createQueryBuilder('session')
        .addSelect('session.refreshTokenHash')
        .addSelect('session.accessTokenHash')
        .leftJoinAndSelect('session.user', 'user')
        .where('session.id = :sessionId', {
          sessionId: parsed.sessionId,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!session) {
        throw new UnauthorizedException('Phiên đăng nhập không tồn tại');
      }

      if (session.revokedAt) {
        throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi');
      }

      if (session.refreshExpiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Refresh token đã hết hạn');
      }

      if (!tokenHashMatches(parsed.secret, session.refreshTokenHash)) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      if (!session.user || session.user.status !== USER_STATUS.ACTIVE) {
        throw new UnauthorizedException('Tài khoản không còn hoạt động');
      }

      if (session.authVersion !== session.user.authVersion) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hiệu lực');
      }

      const now = new Date();

      // Rotate cả access và refresh token.
      // refreshExpiresAt giữ nguyên để session
      // không sống vô hạn.
      const tokens = this.issueTokens(
        session.id,
        now,
        session.refreshExpiresAt,
      );

      session.accessTokenHash = tokens.accessTokenHash;

      session.refreshTokenHash = tokens.refreshTokenHash;

      session.accessExpiresAt = tokens.accessExpiresAt;

      session.lastUsedAt = now;

      await repository.save(session);

      return {
        user: this.userService.toPublicUser(session.user),
        session: {
          id: session.id,
          deviceId: session.deviceId,
          deviceName: session.deviceName,
        },
        tokens: this.toTokenResponse(tokens),
      };
    });
  }

  async logout(auth: AuthContext) {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: new Date(),
        revokedReason: 'logout',
      })
      .where('id = :sessionId', {
        sessionId: auth.sessionId,
      })
      .andWhere('user_id = :userId', {
        userId: auth.userId,
      })
      .andWhere('revoked_at IS NULL')
      .execute();

    return {
      success: true,
      revoked: (result.affected ?? 0) > 0,
    };
  }

  async logoutAll(auth: AuthContext) {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);

      const user = await userRepository.findOne({
        where: {
          id: auth.userId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      user.authVersion += 1;

      await userRepository.save(user);

      await manager
        .getRepository(AuthSession)
        .createQueryBuilder()
        .update(AuthSession)
        .set({
          revokedAt: new Date(),
          revokedReason: 'logout_all',
        })
        .where('user_id = :userId', {
          userId: auth.userId,
        })
        .andWhere('revoked_at IS NULL')
        .execute();

      return {
        success: true,
      };
    });
  }

  async changePassword(auth: AuthContext, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await this.userService.findWithPasswordForUpdate(
        auth.userId,
        manager,
      );

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      const currentValid = await verifyPassword(
        dto.currentPassword,
        user.password,
      );

      if (!currentValid) {
        throw new BadRequestException('Mật khẩu hiện tại không chính xác');
      }

      user.password = await hashPassword(dto.newPassword);

      // Token/session cũ invalid ngay
      // ở request tiếp theo.
      user.authVersion += 1;

      await manager.getRepository(User).save(user);

      await manager
        .getRepository(AuthSession)
        .createQueryBuilder()
        .update(AuthSession)
        .set({
          revokedAt: new Date(),
          revokedReason: 'password_changed',
        })
        .where('user_id = :userId', {
          userId: auth.userId,
        })
        .andWhere('revoked_at IS NULL')
        .execute();

      return {
        success: true,
        message: 'Đổi mật khẩu thành công. Tất cả thiết bị đã bị đăng xuất.',
      };
    });
  }

  async listSessions(auth: AuthContext) {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: auth.userId,
        revokedAt: IsNull(),
      },
      order: {
        lastUsedAt: 'DESC',
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      refreshExpiresAt: session.refreshExpiresAt,
      isCurrent: session.id === auth.sessionId,
    }));
  }

  async revokeSession(auth: AuthContext, sessionId: string) {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: new Date(),
        revokedReason: 'user_revoked',
      })
      .where('id = :sessionId', {
        sessionId,
      })
      .andWhere('user_id = :userId', {
        userId: auth.userId,
      })
      .andWhere('revoked_at IS NULL')
      .execute();

    if (result.affected !== 1) {
      throw new NotFoundException('Không tìm thấy phiên đăng nhập');
    }

    return {
      success: true,
    };
  }

  private async createLoginSession(
    user: User,
    device: ClientDeviceInfo,
    manager: EntityManager,
  ) {
    const repository = manager.getRepository(AuthSession);

    const now = new Date();

    const deviceId = device.deviceId?.trim() || randomUUID();

    // Một deviceId của cùng user chỉ giữ
    // một active session.
    await repository
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: now,
        revokedReason: 'replaced_by_login',
      })
      .where('user_id = :userId', {
        userId: user.id,
      })
      .andWhere('device_id = :deviceId', {
        deviceId,
      })
      .andWhere('revoked_at IS NULL')
      .execute();

    const sessionId = randomUUID();

    const tokens = this.issueTokens(sessionId, now);

    const session = repository.create({
      id: sessionId,
      userId: user.id,
      authVersion: user.authVersion,
      deviceId,
      deviceName: device.deviceName?.trim().slice(0, 255) ?? null,
      userAgent: device.userAgent?.slice(0, 1000) ?? null,
      ipAddress: device.ipAddress?.slice(0, 45) ?? null,
      accessTokenHash: tokens.accessTokenHash,
      refreshTokenHash: tokens.refreshTokenHash,
      accessExpiresAt: tokens.accessExpiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
      lastUsedAt: now,
      revokedAt: null,
      revokedReason: null,
    });

    await repository.save(session);

    return {
      user: this.userService.toPublicUser(user),
      session: {
        id: session.id,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
      },
      tokens: this.toTokenResponse(tokens),
    };
  }

  private issueTokens(
    sessionId: string,
    now: Date,
    absoluteRefreshExpiry?: Date,
  ) {
    const access = createSessionToken(sessionId, 32);

    const refresh = createSessionToken(sessionId, 48);

    const accessExpiresAt = new Date(now.getTime() + this.accessTtlMs);

    const refreshExpiresAt =
      absoluteRefreshExpiry ?? new Date(now.getTime() + this.refreshTtlMs);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,

      accessTokenHash: access.hash,
      refreshTokenHash: refresh.hash,

      accessExpiresAt,
      refreshExpiresAt,
    };
  }

  private toTokenResponse(tokens: {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: Date;
    refreshExpiresAt: Date;
  }) {
    return {
      tokenType: 'Bearer',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
    };
  }
}
