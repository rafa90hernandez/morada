import assert from "node:assert/strict";
import test from "node:test";

import type { Conversation, Message, Visit } from "@/api/types";
import {
  chronologicalMessages,
  otherParticipant,
  parseLocalVisitDateTime,
  visitActions,
} from "./communication-utils";

const message = (id: string, createdAt: string): Message => ({
  id,
  senderId: "user-a",
  type: "TEXT",
  body: id,
  readAt: null,
  createdAt,
});

const visit: Visit = {
  id: "visit-id",
  listingId: "listing-id",
  conversationId: "conversation-id",
  requesterId: "user-a",
  responderId: "user-b",
  replacementForId: null,
  status: "PROPOSED",
  startsAt: "2026-08-12T10:00:00.000Z",
  endsAt: "2026-08-12T11:00:00.000Z",
  proposedAt: "2026-08-11T04:00:00.000Z",
  respondedAt: null,
  cancelledAt: null,
  outcomeAt: null,
  outcomeById: null,
  createdAt: "2026-08-11T04:00:00.000Z",
  updatedAt: "2026-08-11T04:00:00.000Z",
};

test("sorts API message history into chronological display order", () => {
  const result = chronologicalMessages([
    message("new", "2026-08-11T10:01:00.000Z"),
    message("old", "2026-08-11T10:00:00.000Z"),
  ]);
  assert.deepEqual(
    result.map((item) => item.id),
    ["old", "new"],
  );
});

test("derives the counterpart without trusting a client role", () => {
  const conversation = {
    participantA: { id: "user-a", profile: null },
    participantB: { id: "user-b", profile: null },
  } as Conversation;
  assert.equal(otherParticipant(conversation, "user-a").id, "user-b");
});

test("parses a local date-time input and rejects invalid values", () => {
  assert.ok(parseLocalVisitDateTime("2026-08-12 10:30"));
  assert.equal(parseLocalVisitDateTime("not-a-date"), null);
});

test("only the responder can accept or decline a live proposal", () => {
  const now = new Date("2026-08-11T04:00:00.000Z");
  assert.equal(visitActions(visit, "user-b", now).canAccept, true);
  assert.equal(visitActions(visit, "user-a", now).canAccept, false);
});

test("exact location is only presented for an accepted visit that has not ended", () => {
  const now = new Date("2026-08-11T04:00:00.000Z");
  assert.equal(
    visitActions({ ...visit, status: "ACCEPTED" }, "user-a", now)
      .canReadExactLocation,
    true,
  );
  assert.equal(
    visitActions(
      {
        ...visit,
        status: "ACCEPTED",
        endsAt: "2026-08-10T11:00:00.000Z",
      },
      "user-a",
      now,
    ).canReadExactLocation,
    false,
  );
});
