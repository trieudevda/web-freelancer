import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('auth_sessions')
@Index('IDX_auth_session_user_revoked', ['userId', 'revokedAt'])
@Index('IDX_auth_session_user_device', ['userId', 'deviceId'])
export class AuthSession {
  @PrimaryColumn({
    type: 'char',
    length: 36,
  })
  id: string;

  @Column({
    name: 'user_id',
    type: 'int',
  })
  userId: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  // Snapshot authVersion tại thời điểm tạo session.
  @Column({
    name: 'auth_version',
    type: 'int',
    unsigned: true,
  })
  authVersion: number;

  @Column({
    name: 'device_id',
    type: 'varchar',
    length: 100,
  })
  deviceId: string;

  @Column({
    name: 'device_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  deviceName: string | null;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  userAgent: string | null;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipAddress: string | null;

  // Chỉ lưu SHA-256 của token secret.
  @Column({
    name: 'access_token_hash',
    type: 'char',
    length: 64,
    select: false,
  })
  accessTokenHash: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'char',
    length: 64,
    select: false,
  })
  refreshTokenHash: string;

  @Column({
    name: 'access_expires_at',
    type: 'datetime',
    precision: 3,
  })
  accessExpiresAt: Date;

  // Absolute refresh expiry.
  // Refresh token được rotate nhưng không kéo dài vô hạn session.
  @Column({
    name: 'refresh_expires_at',
    type: 'datetime',
    precision: 3,
  })
  refreshExpiresAt: Date;

  @Column({
    name: 'last_used_at',
    type: 'datetime',
    precision: 3,
  })
  lastUsedAt: Date;

  @Column({
    name: 'revoked_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  revokedAt: Date | null;

  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  revokedReason: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
  })
  updatedAt: Date;
}
