import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { listConversations } from "@/api/client";
import type { Conversation } from "@/api/types";
import { AppBadge } from "@/components/ui/AppBadge";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

function displayName(conversation: Conversation, currentUserId: string) {
  const other =
    conversation.participantA.id === currentUserId
      ? conversation.participantB
      : conversation.participantA;
  return other.profile?.displayName || "Usuário do Morada";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
}

export default function ConversationsScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const subtitle = useMemo(
    () => `${items.length} conversa${items.length === 1 ? "" : "s"}`,
    [items.length],
  );

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized || !session) return items;

    return items.filter((item) => {
      const person = displayName(item, session.user.id).toLocaleLowerCase("pt-BR");
      return (
        person.includes(normalized) ||
        item.listing.title.toLocaleLowerCase("pt-BR").includes(normalized)
      );
    });
  }, [items, query, session]);

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
          <Text accessibilityRole="header" style={styles.title}>
            Conversas
          </Text>
          <Text style={styles.muted}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityLabel="Abrir notificações"
          onPress={() => router.push("/notifications")}
          style={styles.notificationButton}
        >
          <Text style={styles.notificationIcon}>♢</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Buscar conversas"
          onChangeText={setQuery}
          placeholder="Buscar conversas..."
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          value={query}
        />
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={visibleItems}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ProductState
            actionLabel="Explorar moradias"
            description={
              query
                ? "Nenhuma conversa corresponde à sua busca."
                : "Quando você falar com um anunciante, a conversa aparecerá aqui."
            }
            onAction={() => router.push("/")}
            title={query ? "Nenhum resultado" : "Nenhuma conversa ainda"}
          />
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const person = displayName(item, session.user.id);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/conversations/[id]",
                  params: { id: item.id },
                })
              }
              style={({ pressed }) => [
                styles.conversationRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(person)}</Text>
              </View>
              <View style={styles.conversationCopy}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.person}>
                    {person}
                  </Text>
                  <Text style={styles.time}>
                    {item.lastMessageAt
                      ? new Date(item.lastMessageAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      : "Agora"}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.listing}>
                  {item.listing.title}
                </Text>
                <View style={styles.statusRow}>
                  <AppBadge
                    label={
                      item.status === "ACTIVE"
                        ? "Conversa ativa"
                        : "Contato indisponível"
                    }
                    tone={item.status === "ACTIVE" ? "primary" : "danger"}
                  />
                </View>
              </View>
            </Pressable>
          );
        }}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  notificationIcon: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  searchWrap: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    color: colors.textMuted,
    fontSize: 22,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 15,
  },
  errorText: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.danger,
    fontFamily: fontFamily.medium,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  conversationRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
  },
  conversationCopy: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  person: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  listing: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
  statusRow: {
    alignItems: "flex-start",
    marginTop: 2,
  },
  time: {
    color: colors.textSubtle,
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
