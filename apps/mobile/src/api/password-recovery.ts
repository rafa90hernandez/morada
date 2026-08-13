import { API_BASE_URL } from "./client";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type PasswordRecoveryRequestResult = {
  accepted: true;
  developmentToken?: string;
};

async function request<T>(path: string, init: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
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

export function requestPasswordRecovery(email: string) {
  return request<PasswordRecoveryRequestResult>("/auth/password-recovery/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ reset: true }>("/auth/password-recovery/reset", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
