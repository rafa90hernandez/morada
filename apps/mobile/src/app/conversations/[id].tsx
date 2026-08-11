import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  acceptVisit,
  cancelVisit,
  declineVisit,
  getConversation,
  getVisitLocation,
  listMessageAttachments,
  listMessages,
  listVisits,
  proposeVisit,
  recordVisitOutcome,
  sendTextMessage,
} from "@/api/client";
import type {
  Conversation,
  ExactVisitLocation,
  Message,
  MessageAttachment,
  Visit,
} from "@/api/types";
import { AppButton } from "@/components/ui/AppButton";
import {
  chronologicalMessages,
  otherParticipant,
  parseLocalVisitDateTime,
  visitActions,
} from "@/features/communication/communication-utils";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: number }).status)
    : undefined;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function visitLabel(status: Visit["status"]) {
  const labels: Record<Visit["status"], string> = {
    PROPOSED: "Proposta pendente",
    ACCEPTED: "Visita confirmada",
    DECLINED: "Proposta recusada",
    REPLACED: "Horário substituído",
    CANCELLED: "Visita cancelada",
    COMPLETED: "Visita concluída",
    NO_SHOW: "Não comparecimento registrado",
  };
  return labels[status];
}

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [attachments, setAttachments] = useState<
    Record<string, MessageAttachment[]>
  >({});
  const [messageBody, setMessageBody] = useState("");
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");
  const [locations, setLocations] = useState<Record<string, ExactVisitLocation>>(
    {},
  );
  const [overlapNotice, setOverlapNotice] = useState<string | null>(null);
  const [contactUnavailable, setContactUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [workingVisitId, setWorkingVisitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.accessToken;
  const currentUserId = session?.user.id;

  const load = useCallback(async () => {
    if (!accessToken || !params.id) return;
    try {
      const [conversationResult, messageResult, allVisits] = await Promise.all([
        getConversation(params.id, accessToken),
        listMessages(params.id, accessToken),
        listVisits(accessToken),
      ]);

      setConversation(conversationResult);
      setContactUnavailable(conversationResult.status !== "ACTIVE");
      const orderedMessages = chronologicalMessages(messageResult.items);
      setMessages(orderedMessages);
      setVisits(allVisits.filter((visit) => visit.conversationId === params.id));

      const attachmentEntries = await Promise.all(
        orderedMessages
          .filter((message) => message.type === "IMAGE")
          .map(async (message) => {
            try {
              const metadata = await listMessageAttachments(
                params.id,
                message.id,
                accessToken,
              );
              return [message.id, metadata] as const;
            } catch {
              return [message.id, []] as const;
            }
          }),
      );
      setAttachments(Object.fromEntries(attachmentEntries));

      setLocations((current) => {
        const allowedVisitIds = new Set(
          allVisits
            .filter(
              (visit) =>
                visit.conversationId === params.id &&
                currentUserId &&
                visitActions(visit, currentUserId).canReadExactLocation,
            )
            .map((visit) => visit.id),
        );
        return Object.fromEntries(
          Object.entries(current).filter(([visitId]) =>
            allowedVisitIds.has(visitId),
          ),
        );
      });
      setError(null);
    } catch (loadError) {
      if (statusOf(loadError) === 401) {
        router.replace({
          pathname: "/login",
          params: { returnTo: `/conversations/${params.id}` },
        });
        return;
      }
      setError("Não foi possível atualizar esta conversa agora.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentUserId, params.id]);

  useEffect(() => {
    if (!session) {
      router.replace({
        pathname: "/login",
        params: { returnTo: `/conversations/${params.id}` },
      });
      return;
    }

    void load();
    const timer = setInterval(() => void load(), 12000);
    return () => clearInterval(timer);
  }, [load, params.id, session]);

  const counterpart = useMemo(() => {
    if (!conversation || !currentUserId) return null;
    return otherParticipant(conversation, currentUserId);
  }, [conversation, currentUserId]);

  const send = async () => {
    if (!accessToken || !params.id) return;
    const body = messageBody.trim();
    if (!body) {
      setError("Digite uma mensagem antes de enviar.");
      return;
    }
    if (body.length > 2000) {
      setError("A mensagem pode ter no máximo 2.000 caracteres.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendTextMessage(params.id, body, accessToken);
      setMessageBody("");
      await load();
    } catch (sendError) {
      if (statusOf(sendError) === 403) {
        setContactUnavailable(true);
        setError(
          "O contato não está disponível. O histórico continua visível, mas novas mensagens não podem ser enviadas.",
        );
      } else {
        setError("Não foi possível enviar a mensagem agora.");
      }
    } finally {
      setSending(false);
    }
  };

  const createVisit = async () => {
    if (!accessToken || !params.id) return;
    const startsAt = parseLocalVisitDateTime(visitStart);
    const endsAt = parseLocalVisitDateTime(visitEnd);
    if (!startsAt || !endsAt || endsAt.getTime() <= startsAt.getTime()) {
      setError("Informe início e fim válidos para a visita.");
      return;
    }

    setError(null);
    try {
      await proposeVisit(
        params.id,
        startsAt.toISOString(),
        endsAt.toISOString(),
        accessToken,
      );
      setVisitStart("");
      setVisitEnd("");
      await load();
    } catch (visitError) {
      if (statusOf(visitError) === 403) setContactUnavailable(true);
      setError("Não foi possível propor esse horário de visita.");
    }
  };

  const actOnVisit = async (
    visit: Visit,
    action: "accept" | "decline" | "cancel" | "completed" | "no-show",
  ) => {
    if (!accessToken) return;
    setWorkingVisitId(visit.id);
    setError(null);
    setOverlapNotice(null);
    try {
      if (action === "accept") {
        const result = await acceptVisit(visit.id, accessToken);
        if (result.overlapWarning) {
          setOverlapNotice(
            `Atenção: este horário se sobrepõe a ${result.conflicts.length} outra visita confirmada para o anúncio.`,
          );
        }
      } else if (action === "decline") {
        await declineVisit(visit.id, accessToken);
      } else if (action === "cancel") {
        await cancelVisit(visit.id, accessToken);
      } else {
        await recordVisitOutcome(
          visit.id,
          action === "completed" ? "COMPLETED" : "NO_SHOW",
          accessToken,
        );
      }
      await load();
    } catch {
      setError("Não foi possível atualizar esta visita agora.");
    } finally {
      setWorkingVisitId(null);
    }
  };

  const revealLocation = async (visit: Visit) => {
    if (!accessToken) return;
    setWorkingVisitId(visit.id);
    setError(null);
    try {
      const location = await getVisitLocation(visit.id, accessToken);
      setLocations((current) => ({ ...current, [visit.id]: location }));
    } catch {
      setLocations((current) => {
        const next = { ...current };
        delete next[visit.id];
        return next;
      });
      setError(
        "O endereço exato não está disponível para esta visita neste momento.",
      );
    } finally {
      setWorkingVisitId(null);
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando conversa...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.center}>
        <Text style={styles.sectionTitle}>Conversa indisponível</Text>
        <Text style={styles.muted}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text accessibilityRole="header" style={styles.title}>
          {counterpart?.profile?.displayName || "Conversa do Morada"}
        </Text>
        <Text style={styles.muted}>{conversation.listing.title}</Text>
        <Text style={styles.disclaimer}>
          O Morada não mostra presença online nem confirma entrega/leitura em
          tempo real.
        </Text>
      </View>

      {contactUnavailable ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Contato indisponível</Text>
          <Text style={styles.mutedLeft}>
            O histórico permanece visível, mas novas mensagens e propostas não
            devem ser enviadas enquanto o backend negar o contato.
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {overlapNotice ? (
        <Text style={styles.warningText}>{overlapNotice}</Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mensagens</Text>
        {messages.length === 0 ? (
          <Text style={styles.mutedLeft}>Nenhuma mensagem ainda.</Text>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === session.user.id;
            const messageAttachments = attachments[message.id] ?? [];
            return (
              <View
                key={message.id}
                style={[
                  styles.message,
                  mine ? styles.mine : styles.theirs,
                ]}
              >
                {message.body ? (
                  <Text style={styles.messageText}>{message.body}</Text>
                ) : null}
                {message.type === "IMAGE" ? (
                  <View style={styles.attachmentCard}>
                    <Text style={styles.attachmentTitle}>Anexo privado</Text>
                    {messageAttachments.length > 0 ? (
                      messageAttachments.map((attachment) => (
                        <Text key={attachment.id} style={styles.attachmentMeta}>
                          {attachment.type === "PDF" ? "PDF" : "Imagem"} ·{" "}
                          {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.attachmentMeta}>
                        Metadados indisponíveis.
                      </Text>
                    )}
                    <Text style={styles.attachmentNote}>
                      Nenhuma URL pública do arquivo é exposta nesta tela.
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.messageTime}>
                  {new Date(message.createdAt).toLocaleString("pt-BR")}
                </Text>
              </View>
            );
          })
        )}

        <TextInput
          accessibilityLabel="Nova mensagem"
          editable={!contactUnavailable && !sending}
          multiline
          onChangeText={setMessageBody}
          placeholder="Escreva uma mensagem..."
          placeholderTextColor={colors.textMuted}
          style={styles.messageInput}
          value={messageBody}
        />
        <AppButton
          disabled={contactUnavailable || sending}
          label={sending ? "Enviando..." : "Enviar mensagem"}
          onPress={() => void send()}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Propor uma visita</Text>
        <Text style={styles.mutedLeft}>
          Use o formato AAAA-MM-DD HH:mm. O horário será enviado ao backend com
          o fuso do aparelho.
        </Text>
        <TextInput
          accessibilityLabel="Início da visita"
          editable={!contactUnavailable}
          onChangeText={setVisitStart}
          placeholder="2026-08-15 14:00"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={visitStart}
        />
        <TextInput
          accessibilityLabel="Fim da visita"
          editable={!contactUnavailable}
          onChangeText={setVisitEnd}
          placeholder="2026-08-15 14:30"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={visitEnd}
        />
        <AppButton
          disabled={contactUnavailable}
          label="Propor horário"
          onPress={() => void createVisit()}
          variant="secondary"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visitas</Text>
        {visits.length === 0 ? (
          <Text style={styles.mutedLeft}>Nenhuma visita combinada ainda.</Text>
        ) : (
          visits.map((visit) => {
            const actions = visitActions(visit, session.user.id);
            const location = locations[visit.id];
            return (
              <View key={visit.id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitStatus}>{visitLabel(visit.status)}</Text>
                  <Text style={styles.visitTime}>
                    {formatDate(visit.startsAt)} → {formatDate(visit.endsAt)}
                  </Text>
                </View>

                {actions.canAccept ? (
                  <View style={styles.inlineActions}>
                    <ActionChip
                      label="Aceitar"
                      onPress={() => void actOnVisit(visit, "accept")}
                    />
                    <ActionChip
                      label="Recusar"
                      onPress={() => void actOnVisit(visit, "decline")}
                    />
                  </View>
                ) : null}

                {actions.canCancel ? (
                  <ActionChip
                    label="Cancelar visita"
                    onPress={() => void actOnVisit(visit, "cancel")}
                  />
                ) : null}

                {actions.canReadExactLocation ? (
                  <AppButton
                    disabled={workingVisitId === visit.id}
                    label={location ? "Atualizar endereço" : "Ver endereço da visita"}
                    onPress={() => void revealLocation(visit)}
                    variant="secondary"
                  />
                ) : null}

                {location ? (
                  <View style={styles.locationCard}>
                    <Text style={styles.locationTitle}>Endereço autorizado</Text>
                    <Text style={styles.locationText}>
                      {location.addressLine1}
                      {location.addressLine2 ? `, ${location.addressLine2}` : ""}
                      {location.eircode ? ` · ${location.eircode}` : ""}
                    </Text>
                    <Text style={styles.attachmentNote}>
                      Este endereço veio do endpoint privado da visita aceita.
                    </Text>
                  </View>
                ) : null}

                {actions.canRecordOutcome ? (
                  <View style={styles.inlineActions}>
                    <ActionChip
                      label="Visita realizada"
                      onPress={() => void actOnVisit(visit, "completed")}
                    />
                    <ActionChip
                      label="Não compareceu"
                      onPress={() => void actOnVisit(visit, "no-show")}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function ActionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
    >
      <Text style={styles.actionChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  headerCard: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  warningCard: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: "#FFF4E5",
    padding: spacing.md,
  },
  warningTitle: {
    color: colors.warning,
    fontWeight: "800",
  },
  warningText: {
    color: colors.warning,
    fontWeight: "700",
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
  section: {
    gap: spacing.md,
  },
  sectionCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  mutedLeft: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  message: {
    maxWidth: "88%",
    gap: spacing.xs,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primarySoft,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  messageTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  messageInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  attachmentCard: {
    gap: 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  attachmentTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  attachmentMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  attachmentNote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  visitCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  visitHeader: {
    gap: spacing.xs,
  },
  visitStatus: {
    color: colors.primary,
    fontWeight: "800",
  },
  visitTime: {
    color: colors.text,
    fontWeight: "700",
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionChipText: {
    color: colors.text,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
  locationCard: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  locationTitle: {
    color: colors.primary,
    fontWeight: "800",
  },
  locationText: {
    color: colors.text,
    fontWeight: "700",
    lineHeight: 21,
  },
});
