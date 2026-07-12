import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserMapper } from '../common/mappers/user.mapper';
import type { PrivateUserWithRelations } from '../common/mappers/user.mapper';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: PrivateUserWithRelations) {
    return UserMapper.toPrivateResponse(user);
  }
}
