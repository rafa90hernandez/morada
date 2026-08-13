import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { listFavorites, removeFavorite } from "@/api/client";
import type { FavoriteListItem } from "@/api/types";
import { ListingCard } from "@/components/ListingCard";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, spacing } from "@/theme/tokens";

export default function FavoritesScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<FavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      router.replace({ pathname: "/login", params: { returnTo: "/favorites" } });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setItems(await listFavorites(session.accessToken));
    } catch {
      setError("Não foi possível carregar seus favoritos agora.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (listingId: string) => {
    if (!session) return;
    setRemovingId(listingId);
    setError(null);
    try {
      await removeFavorite(listingId, session.accessToken);
      setItems((current) =>
        current.filter((item) => item.listing.id !== listingId),
      );
    } catch {
      setError("Não foi possível remover este favorito.");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando favoritos...</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Não foi possível abrir seus favoritos</Text>
        <Text style={styles.muted}>{error}</Text>
        <AppButton label="Tentar novamente" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.favoriteId}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.title}>Nenhum favorito ainda</Text>
          <Text style={styles.muted}>
            Salve anúncios interessantes para encontrá-los novamente aqui.
          </Text>
          <AppButton label="Explorar moradias" onPress={() => router.push("/")} />
        </View>
      }
      ListHeaderComponent={
        error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <ListingCard
            listing={item.listing}
            onPress={() =>
              router.push({
                pathname: "/listing/[id]",
                params: { id: item.listing.id },
              })
            }
          />
          <AppButton
            disabled={removingId === item.listing.id}
            label={
              removingId === item.listing.id
                ? "Removendo..."
                : "Remover dos favoritos"
            }
            onPress={() => void remove(item.listing.id)}
            variant="secondary"
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  item: {
    gap: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  muted: {
    maxWidth: 320,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
});
