import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstname: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastname: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
