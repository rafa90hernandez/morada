import { createHash, randomUUID } from 'node:crypto';

import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { PrivateStorageService } from '../common/storage/private-storage.interface';
import { PRIVATE_STORAGE_SERVICE } from '../common/storage/storage.tokens';
import { DatabaseService } from '../database/database.service';
import {
  ConversationStatus,
  MessageType,
  UserStatus,
} from '../generated/prisma/enums';
import {
  MessageAttachmentProcessor,
  type MessageAttachmentInput,
} from './message-attachment.processor';

export type MessageAttachmentUploadResult = {
  message: {
    id: string;
    senderId: string;
    type: MessageType;
    body: string | null;
    readAt: Date | null;
    createdAt: Date;
  };
  attachment: {
    id: string;
    type: 'IMAGE' | 'PDF';
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  };
};

@Injectable()
export class MessageAttachmentService {
  private readonly logger = new Logger(MessageAttachmentService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly processor: MessageAttachmentProcessor,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  async upload(
    userId: string,
    conversationId: string,
    file: MessageAttachmentInput,
    now = new Date(),
  ): Promise<MessageAttachmentUploadResult> {
    await this.assertActiveUser(userId);
    await this.assertSendableParticipant(userId, conversationId);

    const processed = await this.processor.process(file);
    const messageId = randomUUID();
    const attachmentId = randomUUID();
    const objectKey = [
      'conversation-attachments',
      conversationId,
      messageId,
      `${attachmentId}.${processed.extension}`,
    ].join('/');
    const sha256 = createHash('sha256').update(processed.buffer).digest('hex');

    await this.privateStorage.upload({
      key: objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      return await this.database.$transaction(async (transaction) => {
        const conversation = await transaction.conversation.findFirst({
          where: {
            id: conversationId,
            status: ConversationStatus.ACTIVE,
            OR: [{ participantAId: userId }, { participantBId: userId }],
          },
          select: { id: true },
        });

        if (!conversation) {
          throw new ForbiddenException(
            'Conversation is not currently sendable.',
          );
        }

        const message = await transaction.message.create({
          data: {
            id: messageId,
            conversationId,
            senderId: userId,
            type: MessageType.IMAGE,
            body: null,
            createdAt: now,
          },
          select: {
            id: true,
            senderId: true,
            type: true,
            body: true,
            readAt: true,
            createdAt: true,
          },
        });

        const attachment = await transaction.messageAttachment.create({
          data: {
            id: attachmentId,
            messageId,
            type: processed.type,
            objectKey,
            mimeType: processed.mimeType,
            sizeBytes: processed.sizeBytes,
            sha256,
            createdAt: now,
          },
          select: {
            id: true,
            type: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        });

        await transaction.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: now },
          select: { id: true },
        });

        return {
          message,
          attachment,
        };
      });
    } catch (error: unknown) {
      await this.rollbackObject(objectKey);
      throw error;
    }
  }

  async listForMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    await this.assertActiveUser(userId);
    await this.assertParticipant(userId, conversationId);
    await this.assertMessageInConversation(messageId, conversationId);

    return this.database.messageAttachment.findMany({
      where: {
        messageId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
  }

  async read(
    userId: string,
    conversationId: string,
    messageId: string,
    attachmentId: string,
  ) {
    await this.assertActiveUser(userId);
    await this.assertParticipant(userId, conversationId);
    await this.assertMessageInConversation(messageId, conversationId);

    const attachment = await this.database.messageAttachment.findFirst({
      where: {
        id: attachmentId,
        messageId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        objectKey: true,
        mimeType: true,
        sizeBytes: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Message attachment not found.');
    }

    const buffer = await this.privateStorage.read(attachment.objectKey);

    return {
      id: attachment.id,
      type: attachment.type,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      buffer,
    };
  }

  private async assertActiveUser(userId: string): Promise<void> {
    const user = await this.database.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException('Active account required.');
    }
  }

  private async assertMessageInConversation(
    messageId: string,
    conversationId: string,
  ): Promise<void> {
    const message = await this.database.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      select: { id: true },
    });

    if (!message) {
      throw new NotFoundException('Message attachment not found.');
    }
  }

  private async assertParticipant(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.database.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }
  }

  private async assertSendableParticipant(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.database.conversation.findFirst({
      where: {
        id: conversationId,
        status: ConversationStatus.ACTIVE,
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new ForbiddenException('Conversation is not currently sendable.');
    }
  }

  private async rollbackObject(objectKey: string): Promise<void> {
    try {
      await this.privateStorage.delete(objectKey);
    } catch (rollbackError: unknown) {
      this.logger.error(
        `Failed to roll back private message attachment ${objectKey}.`,
        rollbackError instanceof Error ? rollbackError.stack : undefined,
      );
    }
  }
}
