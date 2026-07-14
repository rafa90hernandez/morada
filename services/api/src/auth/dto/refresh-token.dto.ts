import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token returned during login or registration.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
