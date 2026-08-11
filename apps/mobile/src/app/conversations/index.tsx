import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { listConversations } from "@/api/client";
import type { Conversation } from "@/api/types";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

function displayName(conversation: Conversation, currentUserId: string) {
  const other =
    conversation.participantA.id === currentUserId
      ? conversation.participantB
      : conversation.participantA;
  return other.profile?.displayName || "Usuário do Morada";
}

export default function ConversationsScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.accessToken;

  const load = useCallback(
    async (manual = false) => {
      if (!accessToken) return;
      if (manual) setRefreshing(true);
      setError(null);
      try {
        const result = await listConversations(accessToken);
        setItems(result.items);
      } catch {
        setError("Não foi possível atualizar suas conversas agora.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!session) {
      router.replace({
        pathname: "/login",
        params: { returnTo: "/conversations" },
      });
      return;
    }

    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load, session]);

  const subtitle = useMemo(() => {
    if (!session) return "";
    return `${items.length} conversa${items.length === 1 ? "" : "s"}`;
  }, [items.length, session]);

  if (!session) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando suas conversas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            Suas conversas
          </Text>
          <Text style={styles.muted}>{subtitle}</Text>
        </View>
        <AppButton
          label="Notificações"
          onPress={() => router.push("/notifications")}
          variant="secondary"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
            <Text style={styles.muted}>
              Abra um anúncio elegível e toque em “Falar com anunciante”.
            </Text>
            <AppButton
              label="Explorar moradias"
              onPress={() => router.push("/")}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/conversations/[id]",
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.person}>
                {displayName(item, session.user.id)}
              </Text>
              {item.status !== "ACTIVE" ? (
                <Text style={styles.blocked}>Contato indisponível</Text>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.listing}>
              {item.listing.title}
            </Text>
            <Text style={styles.time}>
              {item.lastMessageAt
                ? `Atualizada ${new Date(item.lastMessageAt).toLocaleString("pt-BR")}`
                : "Conversa iniciada"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
  error: {
    marginHorizontal: spacing.lg,
    color: colors.danger,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  person: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  blocked: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  listing: {
    color: colors.textMuted,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
  },
});
