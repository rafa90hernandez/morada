import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessageAttachmentProcessor } from './message-attachment.processor';
import { MessageAttachmentService } from './message-attachment.service';
import { UserBlockingController } from './user-blocking.controller';
import { UserBlockingService } from './user-blocking.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ConversationsController, UserBlockingController],
  providers: [
    ConversationsService,
    MessageAttachmentProcessor,
    MessageAttachmentService,
    UserBlockingService,
  ],
  exports: [
    ConversationsService,
    MessageAttachmentService,
    UserBlockingService,
  ],
})
export class ConversationsModule {}
