import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserBlockingService } from './user-blocking.service';

@ApiTags('User blocking')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@UseGuards(JwtAuthGuard)
@Controller('users/me/blocks')
export class UserBlockingController {
  constructor(private readonly userBlockingService: UserBlockingService) {}

  @Get()
  @ApiOperation({ summary: 'List users blocked by the authenticated user' })
  list(@CurrentUser('id') userId: string) {
    return this.userBlockingService.list(userId);
  }

  @Post(':blockedUserId')
  @ApiOperation({ summary: 'Block another user' })
  block(
    @CurrentUser('id') userId: string,
    @Param('blockedUserId') blockedUserId: string,
  ) {
    return this.userBlockingService.block(userId, blockedUserId);
  }

  @Delete(':blockedUserId')
  @ApiOperation({ summary: 'Remove a block created by the authenticated user' })
  unblock(
    @CurrentUser('id') userId: string,
    @Param('blockedUserId') blockedUserId: string,
  ) {
    return this.userBlockingService.unblock(userId, blockedUserId);
  }
}
