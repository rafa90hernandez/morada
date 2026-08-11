import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { ConversationPageQueryDto } from './dto/conversation-page-query.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { MessageAttachmentProcessor } from './message-attachment.processor';
import { MessageAttachmentService } from './message-attachment.service';

@ApiTags('Conversations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messageAttachmentService: MessageAttachmentService,
  ) {}

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
  @ApiOperation({ summary: 'List message history for a conversation' })
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
    return this.conversationsService.sendText(userId, conversationId, dto.body);
  }

  @Post(':conversationId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MessageAttachmentProcessor.MAX_INPUT_SIZE_BYTES,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send one private image or PDF attachment' })
  uploadAttachment(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Message attachment file is required.');
    }

    return this.messageAttachmentService.upload(userId, conversationId, {
      buffer: file.buffer,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Get(':conversationId/messages/:messageId/attachments')
  @ApiOperation({ summary: 'List private attachment metadata for one message' })
  listAttachments(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messageAttachmentService.listForMessage(
      userId,
      conversationId,
      messageId,
    );
  }

  @Get(':conversationId/messages/:messageId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Read a participant-only private attachment' })
  async readAttachment(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const attachment = await this.messageAttachmentService.read(
      userId,
      conversationId,
      messageId,
      attachmentId,
    );

    const isPdf = attachment.type === 'PDF';
    const extension = isPdf ? 'pdf' : 'jpg';
    const prefix = isPdf ? 'message-document' : 'message-image';

    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      `${isPdf ? 'attachment' : 'inline'}; filename="${prefix}-${attachment.id}.${extension}"`,
    );

    return new StreamableFile(attachment.buffer);
  }
}
