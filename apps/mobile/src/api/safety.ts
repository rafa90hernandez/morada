import { API_BASE_URL } from "./client";

export type ReportReason =
  | "SCAM"
  | "HARASSMENT"
  | "SPAM"
  | "OFFENSIVE_LANGUAGE"
  | "MISLEADING_LISTING"
  | "SUSPICIOUS_PAYMENT"
  | "ABUSIVE_BEHAVIOR"
  | "OTHER";

export type CreateReportInput = {
  reason: ReportReason;
  description?: string;
  reportedUserId?: string;
  listingId?: string;
  conversationId?: string;
};

export type OwnBlock = {
  blockedId: string;
  createdAt: string;
  blocked: {
    profile: {
      displayName: string;
      profilePhotoUrl: string | null;
    } | null;
  };
};

type ApiEnvelope<T> = { success: boolean; data: T; timestamp: string };

async function request<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(
      `Morada API request failed with status ${response.status}.`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new Error("Morada API returned an unsuccessful response.");
  }
  return envelope.data;
}

export function submitReport(input: CreateReportInput, accessToken: string) {
  return request<{ id: string; status: string; createdAt: string }>(
    "/reports",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function listOwnBlocks(accessToken: string) {
  return request<OwnBlock[]>("/users/me/blocks", accessToken);
}

export function blockUser(blockedUserId: string, accessToken: string) {
  return request<{ blockedUserId: string; blocked: true; createdAt: string }>(
    `/users/me/blocks/${encodeURIComponent(blockedUserId)}`,
    accessToken,
    { method: "POST" },
  );
}

export function unblockUser(blockedUserId: string, accessToken: string) {
  return request<{ blockedUserId: string; blocked: false }>(
    `/users/me/blocks/${encodeURIComponent(blockedUserId)}`,
    accessToken,
    { method: "DELETE" },
  );
}
