import type { Conversation, Message, Visit } from "@/api/types";

export function chronologicalMessages(messages: Message[]) {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function otherParticipant(
  conversation: Conversation,
  currentUserId: string,
) {
  return conversation.participantA.id === currentUserId
    ? conversation.participantB
    : conversation.participantA;
}

export function parseLocalVisitDateTime(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function visitActions(
  visit: Visit,
  currentUserId: string,
  now = new Date(),
) {
  const isRequester = visit.requesterId === currentUserId;
  const isResponder = visit.responderId === currentUserId;
  const participant = isRequester || isResponder;
  const ended = new Date(visit.endsAt).getTime() <= now.getTime();

  return {
    canAccept: isResponder && visit.status === "PROPOSED" && !ended,
    canDecline: isResponder && visit.status === "PROPOSED" && !ended,
    canReplace: isResponder && visit.status === "PROPOSED" && !ended,
    canCancel:
      participant &&
      (visit.status === "PROPOSED" || visit.status === "ACCEPTED") &&
      !ended,
    canReadExactLocation: participant && visit.status === "ACCEPTED" && !ended,
    canRecordOutcome: participant && visit.status === "ACCEPTED" && ended,
  };
}
