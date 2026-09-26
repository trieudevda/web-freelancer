import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthSession } from './entities/auth-session.entity.js';

const CLEANUP_BATCH_SIZE = 1_000;

@Injectable()
export class AuthSessionCleanupService {
  private readonly logger = new Logger(AuthSessionCleanupService.name);
  private readonly retentionMs: number;

  constructor(
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
    config: ConfigService,
  ) {
    this.retentionMs =
      config.getOrThrow<number>('AUTH_SESSION_RETENTION_DAYS') *
      24 *
      60 *
      60 *
      1_000;
  }

  @Cron('0 15 * * * *', {
    name: 'auth-session-cleanup',
    waitForCompletion: true,
  })
  async cleanup(): Promise<{ found: number; deleted: number }> {
    const now = new Date();
    const revokedBefore = new Date(now.getTime() - this.retentionMs);
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.id')
      .where('session.refreshExpiresAt <= :now', { now })
      .orWhere('session.revokedAt <= :revokedBefore', { revokedBefore })
      .orderBy('session.refreshExpiresAt', 'ASC')
      .addOrderBy('session.id', 'ASC')
      .take(CLEANUP_BATCH_SIZE)
      .getMany();

    if (sessions.length === 0) {
      return { found: 0, deleted: 0 };
    }

    const result = await this.sessionRepository.delete({
      id: In(sessions.map(({ id }) => id)),
    });
    const deleted = result.affected ?? 0;

    this.logger.log({
      event: 'auth_session_cleanup',
      found: sessions.length,
      deleted,
    });

    return { found: sessions.length, deleted };
  }
}
