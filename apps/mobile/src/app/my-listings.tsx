import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { listMyListings, type OwnerListing } from "@/api/owner-listings";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, spacing } from "@/theme/tokens";

const statusLabels: Record<OwnerListing["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em análise",
  ACTIVE: "Publicado",
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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ANUNCIE COM SEGURANÇA</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Meus anúncios
          </Text>
          <Text style={styles.muted}>
            Crie, acompanhe e gerencie suas moradias em um só lugar.
          </Text>
        </View>
        <AppButton
          label="Novo anúncio"
          onPress={() => router.push("/listing-editor")}
        />
      </View>

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
        <AppCard key={item.id}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <AppBadge
              label={statusLabels[item.status]}
              tone={statusTone(item.status)}
            />
          </View>
          <Text style={styles.muted}>
            {[item.location.area, item.location.city]
              .filter(Boolean)
              .join(" · ") || "Localização não informada"}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {item.pricing.monthlyPriceCents === null
                ? "Preço não informado"
                : `€${(item.pricing.monthlyPriceCents / 100).toFixed(0)}/mês`}
            </Text>
            <Text style={styles.metaMuted}>
              {`${item.photos.length} foto${item.photos.length === 1 ? "" : "s"}`}
            </Text>
          </View>
          {item.moderation.rejectionReason ? (
            <AppCard tone="warm" style={styles.moderationCard}>
              <Text style={styles.moderationTitle}>Ajuste necessário</Text>
              <Text style={styles.error}>
                {item.moderation.rejectionReason}
              </Text>
            </AppCard>
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
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
  },
  headerCopy: {
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
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  meta: {
    color: colors.text,
    fontWeight: "800",
  },
  metaMuted: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  moderationCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  moderationTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
});
