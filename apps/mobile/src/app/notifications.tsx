import { useCallback, useEffect, useState } from "react";
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

import {
  getUnreadNotificationCount,
  getVisit,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/client";
import type { InAppNotification } from "@/api/types";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

export default function NotificationsScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
        const [page, unread] = await Promise.all([
          listNotifications(accessToken),
          getUnreadNotificationCount(accessToken),
        ]);
        setItems(page.items);
        setUnreadCount(unread.count);
      } catch {
        setError("Não foi possível carregar suas notificações agora.");
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
        params: { returnTo: "/notifications" },
      });
      return;
    }
    void load();
  }, [load, session]);

  const openNotification = async (notification: InAppNotification) => {
    if (!accessToken) return;
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification.id, accessToken);
      }
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - (notification.isRead ? 0 : 1)));

      if (!notification.targetId || !notification.targetType) return;
      if (notification.targetType === "CONVERSATION") {
        router.push({
          pathname: "/conversations/[id]",
          params: { id: notification.targetId },
        });
      } else if (notification.targetType === "VISIT") {
        const visit = await getVisit(notification.targetId, accessToken);
        router.push({
          pathname: "/conversations/[id]",
          params: { id: visit.conversationId },
        });
      } else if (notification.targetType === "LISTING") {
        router.push({
          pathname: "/listing/[id]",
          params: { id: notification.targetId },
        });
      }
    } catch {
      setError(
        "A notificação foi mantida, mas o destino não está disponível para sua conta agora.",
      );
      await load();
    }
  };

  const markAll = async () => {
    if (!accessToken) return;
    try {
      await markAllNotificationsRead(accessToken);
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      setError("Não foi possível marcar todas como lidas agora.");
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando notificações...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            Notificações
          </Text>
          <Text style={styles.mutedLeft}>
            {unreadCount} não lida{unreadCount === 1 ? "" : "s"}
          </Text>
        </View>
        <AppButton
          disabled={unreadCount === 0}
          label="Marcar todas"
          onPress={() => void markAll()}
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
            <Text style={styles.emptyTitle}>Tudo tranquilo por aqui</Text>
            <Text style={styles.muted}>
              Novas mensagens, visitas e atualizações relevantes aparecerão
              nesta área.
            </Text>
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
            onPress={() => void openNotification(item)}
            style={({ pressed }) => [
              styles.card,
              !item.isRead && styles.unreadCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleString("pt-BR")}
            </Text>
            {item.targetId === null ? (
              <Text style={styles.staleTarget}>
                O destino desta notificação não está mais disponível.
              </Text>
            ) : null}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  error: {
    marginHorizontal: spacing.lg,
    color: colors.danger,
    lineHeight: 20,
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
  unreadCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  body: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
  },
  staleTarget: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
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
  muted: {
    maxWidth: 320,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  mutedLeft: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.76,
  },
});
