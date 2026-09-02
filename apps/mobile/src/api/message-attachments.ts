import { API_BASE_URL } from "./client";
import { appendMultipartFile, type LocalMultipartFile } from "./multipart";
import type { Message, MessageAttachment } from "./types";

export type LocalMessageAttachmentFile = LocalMultipartFile;

export type MessageAttachmentUploadResult = {
  message: Message;
  attachment: MessageAttachment;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export async function uploadMessageAttachment(
  conversationId: string,
  file: LocalMessageAttachmentFile,
  accessToken: string,
) {
  const form = new FormData();
  await appendMultipartFile(form, "file", file);

  const response = await fetch(
    `${API_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/attachments`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    },
  );

  if (!response.ok) {
    const error = new Error(
      `Morada API request failed with status ${response.status}.`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const envelope = (await response.json()) as ApiEnvelope<MessageAttachmentUploadResult>;
  if (!envelope.success) {
    throw new Error("Morada API returned an unsuccessful response.");
  }

  return envelope.data;
}
