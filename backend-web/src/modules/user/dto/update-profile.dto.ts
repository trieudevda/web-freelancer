import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimString } from '../../../common/validation/transform.util.js';

export class UpdateProfileDto {
  // Version client nhận được khi GET user.
  // Backend chỉ update nếu version DB vẫn giống giá trị này.
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ example: 'An' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstname?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastname?: string;

  @ApiPropertyOptional({ example: '0900000000' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh City' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address?: string;
}
