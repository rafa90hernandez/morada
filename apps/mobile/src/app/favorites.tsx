import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { listFavorites, removeFavorite } from "@/api/client";
import type { FavoriteListItem } from "@/api/types";
import { ListingCard } from "@/components/ListingCard";
import { AppButton } from "@/components/ui/AppButton";
import { ProductState } from "@/components/ui/ProductState";
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
          description="Salve anúncios interessantes para encontrá-los novamente aqui."
          kind="empty"
          onAction={() => router.push("/")}
          title="Nenhum favorito ainda"
        />
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
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
});
