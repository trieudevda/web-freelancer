import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum MediaStatus {
  ACTIVE = 'active',
  PENDING_DELETE = 'pending_delete',
}

@Entity('media')
@Index('IDX_media_cleanup', ['status', 'deleteAfter'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  fileName: string;

  @Column({
    type: 'varchar',
    length: 500,
    unique: true,
  })
  relativePath: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  mimeType: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  mediaType: MediaType;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  size: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  title: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  altText: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: MediaStatus.ACTIVE,
  })
  status: MediaStatus;

  @Column({
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  deletedAt: Date | null;

  @Column({
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  deleteAfter: Date | null;

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'datetime',
    precision: 3,
  })
  updatedAt: Date;
}
