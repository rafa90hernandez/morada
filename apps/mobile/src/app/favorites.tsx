import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { listFavorites, removeFavorite } from "@/api/client";
import type { FavoriteListItem } from "@/api/types";
import { ListingCard } from "@/components/ListingCard";
import { AppButton } from "@/components/ui/AppButton";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, spacing } from "@/theme/tokens";

export default function FavoritesScreen() {
  const { session } = useSession();
  const [items, setItems] = useState<FavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      router.replace({
        pathname: "/login",
        params: { returnTo: "/favorites" },
      });
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
      <ProductState
        description="Estamos reunindo os anúncios que você salvou."
        kind="loading"
        title="Carregando favoritos"
      />
    );
  }

  if (error && items.length === 0) {
    return (
      <ProductState
        actionLabel="Tentar novamente"
        description={error}
        kind="error"
        onAction={() => void load()}
        title="Não foi possível abrir seus favoritos"
      />
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.favoriteId}
      ListEmptyComponent={
        <ProductState
          actionLabel="Explorar moradias"
          description="Toque no coração dos anúncios que você quer guardar para depois."
          kind="empty"
          onAction={() => router.push("/")}
          title="Nenhum favorito ainda"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Meus favoritos
          </Text>
          <Text style={styles.subtitle}>
            {items.length} anúncio{items.length === 1 ? " salvo" : "s salvos"}
          </Text>
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
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
          <View style={styles.removeRow}>
            <Text style={styles.savedHint}>♥ Salvo nos seus favoritos</Text>
            <AppButton
              disabled={removingId === item.listing.id}
              label={removingId === item.listing.id ? "Removendo..." : "Remover"}
              onPress={() => void remove(item.listing.id)}
              variant="secondary"
            />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 14,
  },
  item: {
    gap: spacing.sm,
  },
  removeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  savedHint: {
    flex: 1,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
});
