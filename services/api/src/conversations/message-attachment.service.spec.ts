import { ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  ConversationStatus,
  MessageAttachmentType,
  MessageType,
} from '../generated/prisma/enums';
import { MessageAttachmentService } from './message-attachment.service';

const now = new Date('2026-08-11T01:05:00.000Z');
const processedBuffer = Buffer.from('processed-private-object');

describe('MessageAttachmentService', () => {
  const userFindFirst = jest.fn();
  const conversationFindFirst = jest.fn();
  const conversationUpdate = jest.fn();
  const messageFindFirst = jest.fn();
  const messageCreate = jest.fn();
  const attachmentFindFirst = jest.fn();
  const attachmentCreate = jest.fn();
  const attachmentFindMany = jest.fn();
  const blockFindFirst = jest.fn();
  const transaction = jest.fn();
  const process = jest.fn();
  const upload = jest.fn();
  const read = jest.fn();
  const deleteObject = jest.fn();

  const database = {
    user: { findFirst: userFindFirst },
    conversation: {
      findFirst: conversationFindFirst,
      update: conversationUpdate,
    },
    message: {
      findFirst: messageFindFirst,
      create: messageCreate,
    },
    messageAttachment: {
      findFirst: attachmentFindFirst,
      findMany: attachmentFindMany,
      create: attachmentCreate,
    },
    block: { findFirst: blockFindFirst },
    $transaction: transaction,
  };

  const processor = { process };
  const privateStorage = {
    upload,
    read,
    delete: deleteObject,
  };

  const service = new MessageAttachmentService(
    database as never,
    processor as never,
    privateStorage,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userFindFirst.mockResolvedValue({ id: 'seeker-id' });
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      status: ConversationStatus.ACTIVE,
      participantAId: 'advertiser-id',
      participantBId: 'seeker-id',
    });
    blockFindFirst.mockResolvedValue(null);
    process.mockResolvedValue({
      buffer: processedBuffer,
      type: MessageAttachmentType.PDF,
      mimeType: 'application/pdf',
      sizeBytes: processedBuffer.length,
      extension: 'pdf',
    });
    upload.mockResolvedValue({ key: 'private-key' });
    messageCreate.mockResolvedValue({
      id: 'message-id',
      senderId: 'seeker-id',
      type: MessageType.IMAGE,
      body: null,
      readAt: null,
      createdAt: now,
    });
    attachmentCreate.mockResolvedValue({
      id: 'attachment-id',
      type: MessageAttachmentType.PDF,
      mimeType: 'application/pdf',
      sizeBytes: processedBuffer.length,
      createdAt: now,
    });
    attachmentFindMany.mockResolvedValue([]);
    conversationUpdate.mockResolvedValue({ id: 'conversation-id' });
    transaction.mockImplementation((callback) => callback(database));
    messageFindFirst.mockResolvedValue({ id: 'message-id' });
    attachmentFindFirst.mockResolvedValue({
      id: 'attachment-id',
      type: MessageAttachmentType.PDF,
      objectKey: 'conversation-attachments/private.pdf',
      mimeType: 'application/pdf',
      sizeBytes: processedBuffer.length,
    });
    read.mockResolvedValue(processedBuffer);
    deleteObject.mockResolvedValue(undefined);
  });

  it('stores a server-generated private key and returns no key or checksum', async () => {
    const result = await service.upload(
      'seeker-id',
      'conversation-id',
      {
        buffer: Buffer.from('%PDF-1.7\n%%EOF'),
        mimeType: 'application/pdf',
        sizeBytes: 15,
      },
      now,
    );

    const uploadArg = upload.mock.calls[0]?.[0] as { key: string };
    expect(uploadArg.key).toMatch(
      /^conversation-attachments\/conversation-id\/[0-9a-f-]+\/[0-9a-f-]+\.pdf$/,
    );
    expect(result.attachment).not.toHaveProperty('objectKey');
    expect(result.attachment).not.toHaveProperty('sha256');
  });

  it('rejects attachments before processing when either participant has blocked the other', async () => {
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.upload(
        'seeker-id',
        'conversation-id',
        {
          buffer: Buffer.from('%PDF-1.7\n%%EOF'),
          mimeType: 'application/pdf',
          sizeBytes: 15,
        },
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(process).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('rechecks blocking inside persistence and rolls back the uploaded object', async () => {
    blockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'new-block' });

    await expect(
      service.upload(
        'seeker-id',
        'conversation-id',
        {
          buffer: Buffer.from('%PDF-1.7\n%%EOF'),
          mimeType: 'application/pdf',
          sizeBytes: 15,
        },
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('rechecks participant sendability inside the persistence transaction', async () => {
    conversationFindFirst
      .mockResolvedValueOnce({
        participantAId: 'advertiser-id',
        participantBId: 'seeker-id',
      })
      .mockResolvedValueOnce(null);

    await expect(
      service.upload(
        'seeker-id',
        'conversation-id',
        {
          buffer: Buffer.from('%PDF-1.7\n%%EOF'),
          mimeType: 'application/pdf',
          sizeBytes: 15,
        },
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('keeps attachment history readable while blocked', async () => {
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.listForMessage('seeker-id', 'conversation-id', 'message-id'),
    ).resolves.toEqual([]);
    expect(blockFindFirst).not.toHaveBeenCalled();
  });

  it('reads only after participant and message scoping checks', async () => {
    const result = await service.read(
      'seeker-id',
      'conversation-id',
      'message-id',
      'attachment-id',
    );

    expect(read).toHaveBeenCalledWith('conversation-attachments/private.pdf');
    expect(result.buffer).toBe(processedBuffer);
  });

  it('does not read an attachment when its message is outside the conversation', async () => {
    messageFindFirst.mockResolvedValue(null);

    await expect(
      service.read(
        'seeker-id',
        'conversation-id',
        'foreign-message',
        'attachment-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(attachmentFindFirst).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
});
