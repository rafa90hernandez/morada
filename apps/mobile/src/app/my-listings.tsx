import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { listMyListings, type OwnerListing } from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const statusLabels: Record<OwnerListing["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em análise",
  ACTIVE: "Publicado",
  PAUSED: "Pausado",
  CLOSED: "Encerrado",
  REJECTED: "Correção necessária",
};

export default function MyListingsScreen() {
  const { session, signOut } = useSession();
  const [items, setItems] = useState<OwnerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      router.replace({
        pathname: "/login",
        params: { returnTo: "/my-listings" },
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await listMyListings(session.accessToken));
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível carregar seus anúncios agora.");
    } finally {
      setLoading(false);
    }
  }, [session, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Meus anúncios
          </Text>
          <Text style={styles.muted}>
            Crie, acompanhe e gerencie suas moradias.
          </Text>
        </View>
        <AppButton
          label="Novo anúncio"
          onPress={() => router.push("/listing-editor")}
        />
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>Carregando anúncios...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.state}>
          <Text style={styles.error}>{error}</Text>
          <AppButton
            label="Tentar novamente"
            onPress={() => void load()}
            variant="secondary"
          />
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Você ainda não anunciou</Text>
          <Text style={styles.muted}>
            O anúncio entra em análise antes de ficar visível para outras
            pessoas.
          </Text>
          <AppButton
            label="Criar primeiro anúncio"
            onPress={() => router.push("/listing-editor")}
          />
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusLabels[item.status]}</Text>
            </View>
          </View>
          <Text style={styles.muted}>
            {[item.location.area, item.location.city]
              .filter(Boolean)
              .join(" · ") || "Localização não informada"}
          </Text>
          <Text style={styles.meta}>
            {item.pricing.monthlyPriceCents === null
              ? "Preço não informado"
              : `€${(item.pricing.monthlyPriceCents / 100).toFixed(0)}/mês`}
            {` · ${item.photos.length} foto${item.photos.length === 1 ? "" : "s"}`}
          </Text>
          {item.moderation.rejectionReason ? (
            <Text style={styles.error}>
              Motivo: {item.moderation.rejectionReason}
            </Text>
          ) : null}
          <AppButton
            label="Gerenciar anúncio"
            onPress={() =>
              router.push({
                pathname: "/listing-owner/[id]",
                params: { id: item.id },
              })
            }
            variant="secondary"
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md },
  headerCopy: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  cardTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.textMuted, lineHeight: 21 },
  meta: { color: colors.text, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  state: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  error: { color: colors.danger, lineHeight: 20 },
});
