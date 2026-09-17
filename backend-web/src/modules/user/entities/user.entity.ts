import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { USER_STATUS } from '../../../config/constants/user/user-status';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstname: string;

  @Column({ name: 'last_name' })
  lastname: string;

  @Column({ name: 'phone' })
  phone: string;

  @Column()
  email: string;

  @Column()
  address: string;

  @Column()
  password: string;

  // @Column()
  // image


  @Column({
    type: 'enum',
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE,
  })
  status: USER_STATUS;

  @CreateDateColumn({name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({name: 'deleted_at' })
  deletedAt: Date;
}
