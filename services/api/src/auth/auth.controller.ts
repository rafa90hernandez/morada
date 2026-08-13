import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 10, ttl: 3600000 },
  })
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

  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 30, ttl: 3600000 },
  })
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

  @Throttle({
    short: { limit: 3, ttl: 1000 },
    medium: { limit: 20, ttl: 60000 },
    long: { limit: 100, ttl: 3600000 },
  })
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

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 60000 },
    long: { limit: 10, ttl: 3600000 },
  })
  @Post('password-recovery/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request password recovery without revealing account existence',
  })
  @ApiAcceptedResponse({
    description:
      'The same accepted response is returned whether or not the email exists.',
  })
  requestPasswordRecovery(@Body() dto: RequestPasswordRecoveryDto) {
    return this.authService.requestPasswordRecovery(dto);
  }

  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
    long: { limit: 20, ttl: 3600000 },
  })
  @Post('password-recovery/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password with an expiring recovery token' })
  @ApiOkResponse({ description: 'Password reset and sessions revoked.' })
  @ApiUnauthorizedResponse({
    description: 'Recovery token is invalid, expired or already consumed.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
