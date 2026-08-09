import {
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserMapper } from '../common/mappers/user.mapper';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Authenticated user no longer exists.');
    }

    return UserMapper.toPrivateResponse(user);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update the authenticated user profile',
  })
  @ApiOkResponse({
    description: 'Authenticated user profile updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Profile data failed validation.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired or invalid access token.',
  })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, dto);

    return UserMapper.toPrivateResponse(user);
  }
}
