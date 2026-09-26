import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trimString } from '../../../common/validation/transform.util.js';

export class CreateMediaDto {
  @ApiPropertyOptional({ example: 'Product image' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Front view of the product' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;
}
