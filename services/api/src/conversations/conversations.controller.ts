import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { ConversationPageQueryDto } from './dto/conversation-page-query.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';

@ApiTags('Conversations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('listings/:listingId')
  @ApiOperation({ summary: 'Start or return a listing-bound conversation' })
  startOrGet(
    @CurrentUser('id') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.conversationsService.startOrGet(userId, listingId);
  }

  @Get()
  @ApiOperation({ summary: 'List current user conversations' })
  @ApiOkResponse({ description: 'Participant-only conversation summaries.' })
  list(
    @CurrentUser('id') userId: string,
    @Query() query: ConversationPageQueryDto,
  ) {
    return this.conversationsService.list(userId, query);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get a participant-only conversation summary' })
  get(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.get(userId, conversationId);
  }

  @Get(':conversationId/messages')
  @ApiOperation({ summary: 'List text message history for a conversation' })
  listMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ConversationPageQueryDto,
  ) {
    return this.conversationsService.listMessages(
      userId,
      conversationId,
      query,
    );
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: 'Send a text message in a conversation' })
  sendText(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendTextMessageDto,
  ) {
    return this.conversationsService.sendText(
      userId,
      conversationId,
      dto.body,
    );
  }
}
