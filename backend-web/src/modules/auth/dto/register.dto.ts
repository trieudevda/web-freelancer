import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  normalizeEmail,
  trimString,
} from '../../../common/validation/transform.util.js';

export class RegisterDto {
  @ApiProperty({ example: 'An' })
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

  @ApiProperty({ example: 'an@example.com' })
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

  @ApiProperty({ example: 'StrongPassword123!', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
