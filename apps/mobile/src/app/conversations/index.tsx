import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { listConversations } from "@/api/client";
import type { Conversation } from "@/api/types";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, spacing } from "@/theme/tokens";

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
        <ProductState
          description="Estamos buscando suas conversas mais recentes."
          kind="loading"
          title="Carregando conversas"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>COMUNIDADE MORADA</Text>
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

      {error ? (
        <View style={styles.errorState}>
          <ProductState
            actionLabel="Tentar novamente"
            description={error}
            kind="error"
            onAction={() => void load()}
            title="Não conseguimos atualizar agora"
          />
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ProductState
            actionLabel="Explorar moradias"
            description="Quando você falar com um anunciante, a conversa aparecerá aqui."
            onAction={() => router.push("/")}
            title="Nenhuma conversa ainda"
          />
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
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.person}>
                  {displayName(item, session.user.id)}
                </Text>
                {item.status !== "ACTIVE" ? (
                  <AppBadge label="Contato indisponível" tone="danger" />
                ) : (
                  <AppBadge label="Conversa ativa" tone="primary" />
                )}
              </View>
              <Text numberOfLines={1} style={styles.listing}>
                {item.listing.title}
              </Text>
              <Text style={styles.time}>
                {item.lastMessageAt
                  ? `Atualizada ${new Date(item.lastMessageAt).toLocaleString("pt-BR")}`
                  : "Conversa iniciada"}
              </Text>
            </AppCard>
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
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
  },
  heading: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  errorState: {
    marginHorizontal: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    gap: spacing.sm,
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
  listing: {
    color: colors.textMuted,
  },
  time: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
});
