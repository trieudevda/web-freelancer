import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { USER_STATUS } from '../../../config/constants/user/user-status.js';
import {
  USER_ROLE,
  type UserRole,
} from '../../../config/constants/user/user-role.constants.js';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', length: 255 })
  firstname: string;

  @Column({ name: 'last_name', length: 255 })
  lastname: string;

  @Column({ length: 30 })
  phone: string;

  @Column({
    length: 255,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 500,
  })
  address: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
  })
  password: string;

  // Tăng lên khi cần hủy toàn bộ quyền đăng nhập ngay lập tức.
  @Column({
    name: 'auth_version',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  authVersion: number;

  // Dùng chống lost-update khi 2 client cùng chỉnh sửa user.
  @VersionColumn({
    name: 'version',
    type: 'int',
  })
  version: number;

  @Column({
    type: 'enum',
    enum: Object.values(USER_ROLE),
    default: USER_ROLE.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE,
  })
  status: USER_STATUS;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt: Date | null;
}
