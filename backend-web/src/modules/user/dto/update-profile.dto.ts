import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  // Version client nhận được khi GET user.
  // Backend chỉ update nếu version DB vẫn giống giá trị này.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstname?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastname?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address?: string;
}
