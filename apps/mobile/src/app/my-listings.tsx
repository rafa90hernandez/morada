import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { listMyListings, type OwnerListing } from "@/api/owner-listings";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

const statusLabels: Record<OwnerListing["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em análise",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  CLOSED: "Encerrado",
  REJECTED: "Correção necessária",
};

function statusTone(status: OwnerListing["status"]) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  if (status === "PENDING_REVIEW") return "warning" as const;
  if (status === "DRAFT") return "neutral" as const;
  return "primary" as const;
}

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

  const counts = useMemo(
    () => ({
      all: items.length,
      review: items.filter((item) => item.status === "PENDING_REVIEW").length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      attention: items.filter(
        (item) => item.status === "REJECTED" || item.status === "DRAFT",
      ).length,
    }),
    [items],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Meus anúncios
          </Text>
          <Text style={styles.muted}>
            Acompanhe o status das suas moradias e mantenha tudo atualizado.
          </Text>
        </View>
        <AppButton
          label="+ Novo anúncio"
          onPress={() => router.push("/listing-editor")}
        />
      </View>

      {!loading ? (
        <View style={styles.statsRow}>
          <View style={[styles.stat, styles.statSelected]}>
            <Text style={styles.statValue}>{counts.all}</Text>
            <Text style={styles.statLabel}>Todos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{counts.review}</Text>
            <Text style={styles.statLabel}>Em análise</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{counts.active}</Text>
            <Text style={styles.statLabel}>Ativos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{counts.attention}</Text>
            <Text style={styles.statLabel}>Ajustes</Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ProductState
          description="Estamos buscando seus anúncios e o status mais recente de cada um."
          kind="loading"
          title="Carregando anúncios"
        />
      ) : null}

      {!loading && error ? (
        <ProductState
          actionLabel="Tentar novamente"
          description={error}
          kind="error"
          onAction={() => void load()}
          title="Não conseguimos carregar seus anúncios"
        />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <ProductState
          actionLabel="Criar primeiro anúncio"
          description="Seu anúncio passa por análise antes de ficar visível para outras pessoas."
          onAction={() => router.push("/listing-editor")}
          title="Você ainda não anunciou"
        />
      ) : null}

      {items.map((item) => (
        <AppCard key={item.id} style={styles.listingCard}>
          <View style={styles.row}>
            <View style={styles.homeIcon}>
              <Text style={styles.homeIconText}>⌂</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text numberOfLines={2} style={styles.cardTitle}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.location}>
                {[item.location.area, item.location.city]
                  .filter(Boolean)
                  .join(" · ") || "Localização não informada"}
              </Text>
            </View>
            <AppBadge
              label={statusLabels[item.status]}
              tone={statusTone(item.status)}
            />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.price}>
              {item.pricing.monthlyPriceCents === null
                ? "Preço não informado"
                : `€${(item.pricing.monthlyPriceCents / 100).toFixed(0)}/mês`}
            </Text>
            <Text style={styles.metaMuted}>
              {`${item.photos.length} foto${item.photos.length === 1 ? "" : "s"}`}
            </Text>
          </View>

          {item.moderation.rejectionReason ? (
            <View style={styles.attentionBox}>
              <Text style={styles.attentionTitle}>Ajuste necessário</Text>
              <Text style={styles.error}>{item.moderation.rejectionReason}</Text>
            </View>
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
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  statSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  statValue: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    textAlign: "center",
  },
  listingCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  homeIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  homeIconText: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: "900",
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  location: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  price: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
  },
  metaMuted: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  attentionBox: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
  },
  attentionTitle: {
    color: colors.warning,
    fontFamily: fontFamily.bold,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
});
