import { API_BASE_URL } from "./client";
import type { AuthSession } from "./types";

export type AdultEligibility = {
  isEligible: boolean;
  reason: "ELIGIBLE" | "MISSING_DATE_OF_BIRTH" | "UNDERAGE";
  age: number | null;
};

export type PrivateProfile = {
  id: string;
  displayName: string;
  fullName: string | null;
  dateOfBirth: string | null;
  age: number | null;
  nationality: string | null;
  hometown: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  primaryLanguage: string | null;
  currentLocationStatus: "IN_IRELAND" | "NOT_ARRIVED_YET" | "ARRIVING_SOON";
  currentCity: string | null;
  arrivalDate: string | null;
  occupation: string | null;
  isStudent: boolean;
};

export type PrivateUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  eligibility: AdultEligibility;
  profile: PrivateProfile | null;
  verification: {
    emailVerifiedAt: string | null;
    phoneVerifiedAt: string | null;
    phoneVerificationProvider: string | null;
    documentStatus: string | null;
    documentSubmittedAt: string | null;
    documentReviewedAt: string | null;
  } | null;
};

export type UpdatePrivateProfile = {
  displayName?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  hometown?: string;
  bio?: string;
  primaryLanguage?: string;
  currentLocationStatus?: PrivateProfile["currentLocationStatus"];
  currentCity?: string;
  arrivalDate?: string;
  occupation?: string;
  isStudent?: boolean;
};

export type RegisterAccountInput = {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
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

async function accountRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  return parseResponse<T>(response);
}

export async function registerAccount(input: RegisterAccountInput) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseResponse<AuthSession>(response);
}

export function getMyProfile(accessToken: string) {
  return accountRequest<PrivateUser>("/users/me", accessToken);
}

export function updateMyProfile(
  accessToken: string,
  update: UpdatePrivateProfile,
) {
  return accountRequest<PrivateUser>("/users/me", accessToken, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
}
