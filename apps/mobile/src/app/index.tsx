import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getMapMarkers, searchListings } from "@/api/client";
import type { ListingCard as ListingCardType, MapMarker } from "@/api/types";
import { ApproximateMap } from "@/components/ApproximateMap";
import { ListingCard } from "@/components/ListingCard";
import { AppButton } from "@/components/ui/AppButton";
import { boundsFromCards } from "@/features/discovery/discovery-utils";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

type ViewMode = "list" | "map";

export default function DiscoveryScreen() {
  const { session } = useSession();
  const [listings, setListings] = useState<ListingCardType[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [mode, setMode] = useState<ViewMode>("list");
  const [city, setCity] = useState("Dublin");
  const [maxPrice, setMaxPrice] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const parsedPrice = Number(maxPrice.replace(/[^0-9]/g, ""));
    return {
      city: city.trim() || undefined,
      maxPriceCents: parsedPrice > 0 ? parsedPrice * 100 : undefined,
      furnished: furnished ? true : undefined,
      sort: "RELEVANCE" as const,
    };
  }, [city, furnished, maxPrice]);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await searchListings(filters);
        setListings(result.items);

        const bounds = boundsFromCards(result.items);
        const mapResult = await getMapMarkers(bounds);
        setMarkers(mapResult.markers);
      } catch {
        setError(
          "Não foi possível carregar as moradias agora. Verifique sua conexão e tente novamente.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openListing = (listingId: string) => {
    router.push({ pathname: "/listing/[id]", params: { id: listingId } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>MORADA</Text>
          <Pressable
            accessibilityLabel={session ? "Abrir minha conta" : "Entrar ou criar conta"}
            accessibilityRole="button"
            onPress={() => router.push(session ? "/account" : "/login")}
            style={styles.accountButton}
          >
            <Text style={styles.accountButtonText}>
              {session ? "Minha conta" : "Entrar"}
            </Text>
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Encontre sua próxima moradia
        </Text>
        <Text style={styles.subtitle}>
          Explore anúncios ativos com localização aproximada e sinais de
          confiança claros.
        </Text>
      </View>

      <View style={styles.filters}>
        <TextInput
          accessibilityLabel="Cidade"
          autoCapitalize="words"
          onChangeText={setCity}
          placeholder="Cidade"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={city}
        />
        <TextInput
          accessibilityLabel="Preço máximo mensal em euros"
          inputMode="numeric"
          onChangeText={setMaxPrice}
          placeholder="Máx. €/mês"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={maxPrice}
        />

        <View style={styles.filterActions}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: furnished }}
            onPress={() => setFurnished((value) => !value)}
            style={[styles.chip, furnished && styles.chipSelected]}
          >
            <Text
              style={[styles.chipText, furnished && styles.chipTextSelected]}
            >
              Mobilado
            </Text>
          </Pressable>
          <AppButton label="Buscar" onPress={() => void load()} />
        </View>
      </View>

      <View style={styles.modeSwitch}>
        {(["list", "map"] as const).map((value) => (
          <Pressable
            accessibilityRole="button"
            key={value}
            onPress={() => setMode(value)}
            style={[
              styles.modeButton,
              mode === value && styles.modeButtonActive,
            ]}
          >
            <Text
              style={[styles.modeText, mode === value && styles.modeTextActive]}
            >
              {value === "list" ? "Lista" : "Mapa"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Buscando moradias...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Algo deu errado</Text>
          <Text style={styles.stateText}>{error}</Text>
          <AppButton label="Tentar novamente" onPress={() => void load()} />
        </View>
      ) : mode === "map" ? (
        <View style={styles.mapContainer}>
          <ApproximateMap markers={markers} onMarkerPress={openListing} />
          <Text style={styles.mapFootnote}>
            Os pontos mostram áreas aproximadas, não o endereço exato do imóvel.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={listings}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>Nenhuma moradia encontrada</Text>
              <Text style={styles.stateText}>
                Tente ampliar a cidade ou o preço máximo.
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
            <ListingCard listing={item} onPress={() => openListing(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  brand: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  accountButton: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  accountButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  filters: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.text,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: colors.primary,
  },
  modeSwitch: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeText: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  modeTextActive: {
    color: colors.text,
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  mapContainer: {
    flex: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  mapFootnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateText: {
    maxWidth: 320,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
});
