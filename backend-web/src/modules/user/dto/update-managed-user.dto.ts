import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  USER_ROLE,
  type UserRole,
} from '../../../config/constants/user/user-role.constants.js';
import { USER_STATUS } from '../../../config/constants/user/user-status.js';
import { trimString } from '../../../common/validation/transform.util.js';

export class UpdateManagedUserDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional()
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstname?: string;

  @ApiPropertyOptional()
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastname?: string;

  @ApiPropertyOptional()
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ enum: USER_STATUS })
  @IsOptional()
  @IsEnum(USER_STATUS)
  status?: USER_STATUS;
}

export class UpdateStaffDto extends UpdateManagedUserDto {
  @ApiPropertyOptional({
    enum: [
      USER_ROLE.SUPERADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.EDITOR,
      USER_ROLE.SALES,
    ],
  })
  @IsOptional()
  @IsEnum(USER_ROLE)
  role?: UserRole;
}

export class DeleteManagedUserDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;
}
