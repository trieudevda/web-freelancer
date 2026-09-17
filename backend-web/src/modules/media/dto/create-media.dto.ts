import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;
}
