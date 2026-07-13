import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'rafael@morada.app',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: 'Rafael',
  })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiPropertyOptional({
    example: '+353871234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
