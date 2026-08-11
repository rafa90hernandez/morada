import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessageAttachmentProcessor } from './message-attachment.processor';
import { MessageAttachmentService } from './message-attachment.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    MessageAttachmentProcessor,
    MessageAttachmentService,
  ],
  exports: [ConversationsService, MessageAttachmentService],
})
export class ConversationsModule {}
