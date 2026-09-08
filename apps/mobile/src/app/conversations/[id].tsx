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
import { blockUser, listOwnBlocks, unblockUser } from "@/api/safety";
import { AppButton } from "@/components/ui/AppButton";
import {
  chronologicalMessages,
  otherParticipant,
  parseLocalVisitDateTime,
  visitActions,
} from "@/features/communication/communication-utils";
import { MessageAttachmentComposer } from "@/features/communication/MessageAttachmentComposer";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

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
  const [locations, setLocations] = useState<
    Record<string, ExactVisitLocation>
  >({});
  const [overlapNotice, setOverlapNotice] = useState<string | null>(null);
  const [contactUnavailable, setContactUnavailable] = useState(false);
  const [ownBlock, setOwnBlock] = useState(false);
  const [workingSafety, setWorkingSafety] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [workingVisitId, setWorkingVisitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.accessToken;
  const currentUserId = session?.user.id;

  const load = useCallback(async () => {
    if (!accessToken || !params.id) return;
    try {
      const [conversationResult, messageResult, allVisits, ownBlocks] =
        await Promise.all([
          getConversation(params.id, accessToken),
          listMessages(params.id, accessToken),
          listVisits(accessToken),
          listOwnBlocks(accessToken),
        ]);

      setConversation(conversationResult);
      setContactUnavailable(conversationResult.status !== "ACTIVE");
      const otherUserId =
        conversationResult.participantA.id === currentUserId
          ? conversationResult.participantB.id
          : conversationResult.participantA.id;
      setOwnBlock(ownBlocks.some((block) => block.blockedId === otherUserId));

      const orderedMessages = chronologicalMessages(messageResult.items);
      setMessages(orderedMessages);
      setVisits(
        allVisits.filter((visit) => visit.conversationId === params.id),
      );

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

  const toggleBlock = async () => {
    if (!accessToken || !counterpart) return;
    setWorkingSafety(true);
    setError(null);
    try {
      if (ownBlock) {
        await unblockUser(counterpart.id, accessToken);
      } else {
        await blockUser(counterpart.id, accessToken);
        setContactUnavailable(true);
        setLocations({});
      }
      await load();
    } catch (blockError) {
      if (statusOf(blockError) === 401) {
        router.replace("/login");
        return;
      }
      setError("Não foi possível atualizar o bloqueio agora.");
    } finally {
      setWorkingSafety(false);
    }
  };

  const reportConversation = () => {
    if (!counterpart) return;
    router.push({
      pathname: "/report",
      params: {
        reportedUserId: counterpart.id,
        listingId: conversation?.listing.id,
        conversationId: params.id,
        context: "esta conversa",
      },
    });
  };

  const reportMessage = (message: Message) => {
    if (!counterpart) return;
    router.push({
      pathname: "/report",
      params: {
        reportedUserId: message.senderId,
        listingId: conversation?.listing.id,
        conversationId: params.id,
        context: "esta mensagem",
      },
    });
  };

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

  const counterpartName =
    counterpart?.profile?.displayName || "Usuário do Morada";
  const counterpartInitial = counterpartName.slice(0, 1).toUpperCase();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backSymbol}>‹</Text>
        </Pressable>
        <View style={styles.headerIdentity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{counterpartInitial}</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>
              {counterpartName}
            </Text>
            <Text style={styles.headerStatus}>Conversa no Morada</Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Denunciar conversa"
          accessibilityRole="button"
          disabled={!counterpart}
          onPress={reportConversation}
          style={styles.moreButton}
        >
          <Text style={styles.moreSymbol}>•••</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: "/listing/[id]",
            params: { id: conversation.listing.id },
          })
        }
        style={({ pressed }) => [
          styles.listingContext,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.listingIcon}>
          <Text style={styles.listingIconText}>⌂</Text>
        </View>
        <View style={styles.listingCopy}>
          <Text style={styles.listingEyebrow}>ANÚNCIO DA CONVERSA</Text>
          <Text numberOfLines={2} style={styles.listingTitle}>
            {conversation.listing.title}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {contactUnavailable ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Contato indisponível</Text>
          <Text style={styles.mutedLeft}>
            O histórico permanece visível, mas novas mensagens e propostas não
            podem ser enviadas agora.
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {overlapNotice ? (
        <Text style={styles.warningText}>{overlapNotice}</Text>
      ) : null}

      <View style={styles.messagesSection}>
        {messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyTitle}>Comece a conversa</Text>
            <Text style={styles.muted}>
              Tire dúvidas sobre a moradia e combine os próximos passos com o
              anunciante.
            </Text>
          </View>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === session.user.id;
            const messageAttachments = attachments[message.id] ?? [];
            return (
              <View
                key={message.id}
                style={[styles.message, mine ? styles.mine : styles.theirs]}
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
                  </View>
                ) : null}
                <Text style={[styles.messageTime, mine && styles.mineTime]}>
                  {new Date(message.createdAt).toLocaleString("pt-BR")}
                </Text>
                {!mine ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => reportMessage(message)}
                  >
                    <Text style={styles.reportLink}>Denunciar mensagem</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.composerCard}>
        <View style={styles.composerRow}>
          <TextInput
            accessibilityLabel="Nova mensagem"
            editable={!contactUnavailable && !sending}
            multiline
            onChangeText={setMessageBody}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={colors.textMuted}
            style={styles.messageInput}
            value={messageBody}
          />
          <Pressable
            accessibilityLabel={sending ? "Enviando mensagem" : "Enviar mensagem"}
            accessibilityRole="button"
            disabled={contactUnavailable || sending}
            onPress={() => void send()}
            style={({ pressed }) => [
              styles.sendButton,
              (contactUnavailable || sending) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.sendSymbol}>➤</Text>
            )}
          </Pressable>
        </View>
        {accessToken && params.id ? (
          <MessageAttachmentComposer
            accessToken={accessToken}
            conversationId={params.id}
            disabled={contactUnavailable || sending}
            onUploaded={load}
          />
        ) : null}
      </View>

      <View style={styles.visitComposer}>
        <View style={styles.visitHeading}>
          <View style={styles.visitIcon}>
            <Text style={styles.visitIconText}>▦</Text>
          </View>
          <View style={styles.visitHeadingCopy}>
            <Text style={styles.sectionTitle}>Agendar visita</Text>
            <Text style={styles.mutedLeft}>
              Combine um horário para conhecer a moradia presencialmente.
            </Text>
          </View>
        </View>
        <Text style={styles.helper}>Formato: AAAA-MM-DD HH:mm</Text>
        <View style={styles.visitInputs}>
          <TextInput
            accessibilityLabel="Início da visita"
            editable={!contactUnavailable}
            onChangeText={setVisitStart}
            placeholder="2026-09-15 14:00"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={visitStart}
          />
          <TextInput
            accessibilityLabel="Fim da visita"
            editable={!contactUnavailable}
            onChangeText={setVisitEnd}
            placeholder="2026-09-15 14:30"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={visitEnd}
          />
        </View>
        <AppButton
          disabled={contactUnavailable}
          label="Propor horário"
          onPress={() => void createVisit()}
          variant="secondary"
        />
      </View>

      {visits.length > 0 ? (
        <View style={styles.visitsSection}>
          <Text style={styles.sectionTitle}>Visitas</Text>
          {visits.map((visit) => {
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
                    label={
                      location ? "Atualizar endereço" : "Ver endereço da visita"
                    }
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
          })}
        </View>
      ) : null}

      <View style={styles.safetyCard}>
        <Text style={styles.sectionTitle}>Segurança e privacidade</Text>
        <Text style={styles.mutedLeft}>
          O Morada não mostra presença online nem confirma leitura. Bloqueios
          impedem novo contato e o acesso futuro ao endereço exato de visitas,
          mas o histórico permanece disponível.
        </Text>
        <View style={styles.safetyActions}>
          <View style={styles.safetyButton}>
            <AppButton
              disabled={workingSafety || !counterpart}
              label={
                workingSafety
                  ? "Atualizando..."
                  : ownBlock
                    ? "Desbloquear usuário"
                    : "Bloquear usuário"
              }
              onPress={() => void toggleBlock()}
              variant="secondary"
            />
          </View>
          <View style={styles.safetyButton}>
            <AppButton
              disabled={!counterpart}
              label="Denunciar conversa"
              onPress={reportConversation}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function ActionChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  topBar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  backSymbol: {
    marginTop: -3,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 32,
    lineHeight: 34,
  },
  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
  },
  headerStatus: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  moreButton: {
    minWidth: 42,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  moreSymbol: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 1,
  },
  listingContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  listingIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  listingIconText: {
    color: colors.primary,
    fontSize: 24,
  },
  listingCopy: {
    flex: 1,
    gap: 3,
  },
  listingEyebrow: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  listingTitle: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: colors.primary,
    fontSize: 28,
  },
  warningCard: {
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
  },
  warningTitle: {
    color: colors.warning,
    fontFamily: fontFamily.extraBold,
  },
  warningText: {
    marginHorizontal: spacing.md,
    color: colors.warning,
    fontFamily: fontFamily.bold,
    lineHeight: 20,
  },
  error: {
    marginHorizontal: spacing.md,
    color: colors.danger,
    fontFamily: fontFamily.semibold,
    lineHeight: 20,
  },
  messagesSection: {
    gap: spacing.sm,
    minHeight: 180,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyMessages: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
  },
  message: {
    maxWidth: "82%",
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  mine: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  theirs: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.text,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 21,
  },
  messageTime: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
  },
  mineTime: {
    textAlign: "right",
  },
  reportLink: {
    color: colors.danger,
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  attachmentCard: {
    gap: 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  attachmentTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
  },
  attachmentMeta: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
  composerCard: {
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  messageInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fontFamily.regular,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendSymbol: {
    marginLeft: 2,
    color: colors.surface,
    fontSize: 19,
  },
  visitComposer: {
    gap: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  visitHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  visitIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  visitIconText: {
    color: colors.primary,
    fontSize: 20,
  },
  visitHeadingCopy: {
    flex: 1,
    gap: 2,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  visitInputs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: fontFamily.regular,
    paddingHorizontal: spacing.md,
  },
  visitsSection: {
    gap: spacing.md,
    marginHorizontal: spacing.md,
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
    fontFamily: fontFamily.extraBold,
  },
  visitTime: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
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
    fontFamily: fontFamily.bold,
  },
  locationCard: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  locationTitle: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
  },
  locationText: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
    lineHeight: 21,
  },
  safetyCard: {
    gap: spacing.md,
    marginHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  safetyActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  safetyButton: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: "center",
    lineHeight: 20,
  },
  mutedLeft: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
});
