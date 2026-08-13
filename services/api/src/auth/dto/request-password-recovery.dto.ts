import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordRecoveryDto {
  @ApiProperty({ example: 'rafael@morada.app' })
  @IsEmail()
  email!: string;
}
