import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQuery,
  listConversations,
  login,
  setUnauthorizedHandler,
} from "./client";

test("buildQuery omits undefined values and encodes filters", () => {
  assert.equal(
    buildQuery({
      city: "Dublin 8",
      furnished: true,
      maxPriceCents: 100000,
      area: undefined,
    }),
    "?city=Dublin%208&furnished=true&maxPriceCents=100000",
  );
});

test("buildQuery returns an empty string when no query parameters exist", () => {
  assert.equal(buildQuery({ city: undefined }), "");
});

test("authenticated 401 invalidates the in-memory session boundary", async () => {
  const originalFetch = globalThis.fetch;
  let expired = false;
  const clearHandler = setUnauthorizedHandler(() => {
    expired = true;
  });

  globalThis.fetch = async () => new Response(null, { status: 401 });

  try {
    await assert.rejects(() => listConversations("expired-token"));
    assert.equal(expired, true);
  } finally {
    clearHandler();
    globalThis.fetch = originalFetch;
  }
});

test("login 401 is not misclassified as an expired authenticated session", async () => {
  const originalFetch = globalThis.fetch;
  let expired = false;
  const clearHandler = setUnauthorizedHandler(() => {
    expired = true;
  });

  globalThis.fetch = async () => new Response(null, { status: 401 });

  try {
    await assert.rejects(() => login("user@example.com", "wrong-password"));
    assert.equal(expired, false);
  } finally {
    clearHandler();
    globalThis.fetch = originalFetch;
  }
});
