import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  USER_ROLE,
  type UserRole,
} from '../../../config/constants/user/user-role.constants.js';
import {
  normalizeEmail,
  trimString,
} from '../../../common/validation/transform.util.js';

export class CreateStaffDto {
  @ApiProperty({ example: 'Linh' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstname: string;

  @ApiProperty({ example: 'Nguyen' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastname: string;

  @ApiProperty({ example: '0900000000' })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone: string;

  @ApiProperty({ example: 'linh@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    enum: [
      USER_ROLE.SUPERADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.EDITOR,
      USER_ROLE.SALES,
    ],
  })
  @IsEnum(USER_ROLE)
  role: UserRole;
}
