import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserMapper } from '../common/mappers/user.mapper';
import type { PrivateUserWithRelations } from '../common/mappers/user.mapper';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({
    summary: 'Get the authenticated user profile',
  })
  @ApiOkResponse({
    description: 'Authenticated user profile returned successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired or invalid access token.',
  })
  getMe(@CurrentUser() user: PrivateUserWithRelations) {
    return UserMapper.toPrivateResponse(user);
  }
}
