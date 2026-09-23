import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { USER_STATUS } from '../../config/constants/user/user-status.js';
import { parseSessionToken, tokenHashMatches } from './auth-token.util.js';
import { AuthContext } from './auth.types.js';
import { AuthSession } from './entities/auth-session.entity.js';

@Injectable()
export class SessionAuthService {
  constructor(
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
  ) {}

  async validateAccessToken(token: string): Promise<AuthContext> {
    const parsed = parseSessionToken(token);

    if (!parsed) {
      throw new UnauthorizedException('Access token không hợp lệ');
    }

    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .addSelect('session.accessTokenHash')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.id = :sessionId', {
        sessionId: parsed.sessionId,
      })
      .getOne();

    if (!session) {
      throw new UnauthorizedException('Phiên đăng nhập không tồn tại');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi');
    }

    if (session.accessExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Access token đã hết hạn');
    }

    if (!tokenHashMatches(parsed.secret, session.accessTokenHash)) {
      throw new UnauthorizedException('Access token không hợp lệ');
    }

    if (!session.user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    if (session.user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedException('Tài khoản không còn hoạt động');
    }

    // Đổi mật khẩu hoặc logout-all sẽ tăng authVersion.
    // Token cũ bị vô hiệu ngay ở request kế tiếp.
    if (session.authVersion !== session.user.authVersion) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hiệu lực');
    }

    return {
      userId: session.userId,
      sessionId: session.id,
      authVersion: session.authVersion,
      role: session.user.role,
    };
  }
}
