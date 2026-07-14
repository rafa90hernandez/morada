import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create a new user account',
  })
  @ApiCreatedResponse({
    description: 'User registered successfully.',
  })
  @ApiConflictResponse({
    description: 'Email already registered.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate a user',
  })
  @ApiOkResponse({
    description: 'User authenticated successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token and issue a new token pair',
  })
  @ApiOkResponse({
    description: 'Token pair refreshed successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired or invalid refresh token.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke the current refresh token',
  })
  @ApiOkResponse({
    description: 'User logged out successfully.',
  })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }
}
