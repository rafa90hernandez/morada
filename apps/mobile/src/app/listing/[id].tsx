import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  addFavorite,
  getListingDetail,
  listFavorites,
  removeFavorite,
  startConversation,
} from "@/api/client";
import { resolveMediaUrl } from "@/api/media";
import type { ListingDetail } from "@/api/types";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

function price(cents: number | null) {
  if (cents === null) return "Preço a confirmar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [error, setError] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    void getListingDetail(params.id)
      .then((result) => {
        if (active) setListing(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    if (!session) {
      setFavorite(false);
      return;
    }

    let active = true;
    void listFavorites(session.accessToken)
      .then((items) => {
        if (active) {
          setFavorite(items.some((item) => item.listing.id === params.id));
        }
      })
      .catch(() => {
        if (active)
          setFavoriteError("Não foi possível consultar seus favoritos.");
      });

    return () => {
      active = false;
    };
  }, [params.id, session]);

  const toggleFavorite = async () => {
    if (!session) {
      router.push({
        pathname: "/login",
        params: { returnTo: `/listing/${params.id}` },
      });
      return;
    }

    setFavoriteLoading(true);
    setFavoriteError(null);
    try {
      if (favorite) {
        await removeFavorite(params.id, session.accessToken);
        setFavorite(false);
      } else {
        await addFavorite(params.id, session.accessToken);
        setFavorite(true);
      }
    } catch {
      setFavoriteError("Não foi possível atualizar este favorito.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const contactAdvertiser = async () => {
    if (!session) {
      router.push({
        pathname: "/login",
        params: { returnTo: `/listing/${params.id}` },
      });
      return;
    }

    setContacting(true);
    setContactError(null);
    try {
      const conversation = await startConversation(
        params.id,
        session.accessToken,
      );
      router.push({
        pathname: "/conversations/[id]",
        params: { id: conversation.id },
      });
    } catch {
      setContactError(
        "O contato não está disponível para este anúncio neste momento.",
      );
    } finally {
      setContacting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>Anúncio indisponível</Text>
        <Text style={styles.muted}>
          Ele pode ter expirado, sido encerrado ou ficado temporariamente
          indisponível.
        </Text>
      </View>
    );
  }

  const location = [listing.location.area, listing.location.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {listing.photos[0] ? (
        <Image
          accessibilityLabel={`Foto de ${listing.title}`}
          source={{ uri: resolveMediaUrl(listing.photos[0].url) }}
          style={styles.hero}
        />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.eyebrow}>
          {location || "Localização aproximada"}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {listing.title}
        </Text>
        <Text style={styles.price}>
          {price(listing.pricing.monthlyPriceCents)}/mês
        </Text>
        <Text style={styles.description}>{listing.description}</Text>
        {favoriteError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {favoriteError}
          </Text>
        ) : null}
        <AppButton
          label={session ? "Denunciar anúncio" : "Entrar para denunciar"}
          onPress={() => {
            if (!session) {
              router.push({
                pathname: "/login",
                params: { returnTo: `/listing/${params.id}` },
              });
              return;
            }
            router.push({
              pathname: "/report",
              params: { listingId: params.id, context: "este anúncio" },
            });
          }}
          variant="secondary"
        />
        <AppButton
          disabled={favoriteLoading}
          label={
            favoriteLoading
              ? "Atualizando favorito..."
              : favorite
                ? "Remover dos favoritos"
                : session
                  ? "Salvar nos favoritos"
                  : "Entrar para favoritar"
          }
          onPress={() => void toggleFavorite()}
          variant="secondary"
        />
      </View>

      <View style={styles.trustCard}>
        <Text style={styles.sectionTitle}>O que o Morada verificou</Text>
        <TrustRow
          label="Identidade do anunciante"
          value={listing.trust.identityVerified}
        />
        <TrustRow
          label="Vínculo com o imóvel"
          value={listing.trust.relationshipVerified}
        />
        <TrustRow
          label="Autorização do landlord"
          value={listing.trust.landlordAuthorization.status === "VERIFIED"}
        />
        <Text style={styles.trustNote}>
          Verificações reduzem incertezas, mas não significam garantia absoluta
          de segurança ou de fechamento do aluguel.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sobre a moradia</Text>
        <InfoRow label="Tipo" value={listing.accommodation.propertyType} />
        <InfoRow label="Quartos" value={listing.accommodation.bedroomCount} />
        <InfoRow
          label="Banheiros"
          value={listing.accommodation.bathroomCount}
        />
        <InfoRow
          label="Mobilado"
          value={
            listing.accommodation.furnished === null
              ? null
              : listing.accommodation.furnished
                ? "Sim"
                : "Não"
          }
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Localização</Text>
        <Text style={styles.mutedLeft}>
          Por privacidade, o Morada mostra apenas uma área aproximada antes de
          uma visita aceita. O endereço exato não vem deste anúncio.
        </Text>
        {listing.location.approximate ? (
          <Text style={styles.locationHint}>
            Precisão aproximada: raio de{" "}
            {listing.location.approximate.radiusMeters} m
          </Text>
        ) : null}
      </View>

      <View style={styles.contactCard}>
        <Text style={styles.sectionTitle}>Interessado nesta moradia?</Text>
        <Text style={styles.mutedLeft}>
          A conversa fica vinculada a este anúncio. Depois vocês podem combinar
          uma visita pelo próprio Morada.
        </Text>
        {contactError ? <Text style={styles.error}>{contactError}</Text> : null}
        <AppButton
          disabled={contacting}
          label={
            contacting
              ? "Abrindo conversa..."
              : session
                ? "Falar com anunciante"
                : "Entrar para falar com anunciante"
          }
          onPress={() => void contactAdvertiser()}
        />
        {session ? (
          <>
            <AppButton
              label="Meus favoritos"
              onPress={() => router.push("/favorites")}
              variant="secondary"
            />
            <AppButton
              label="Ver minhas conversas"
              onPress={() => router.push("/conversations")}
              variant="secondary"
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function TrustRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, value ? styles.verified : styles.notVerified]}
      >
        {value ? "Verificado" : "Não verificado"}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  hero: {
    width: "100%",
    aspectRatio: 1.45,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  section: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  price: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  trustCard: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  sectionCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  contactCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 32,
  },
  rowLabel: {
    flex: 1,
    color: colors.textMuted,
  },
  rowValue: {
    color: colors.text,
    fontWeight: "700",
  },
  verified: {
    color: colors.primary,
  },
  notVerified: {
    color: colors.textMuted,
  },
  trustNote: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  mutedLeft: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  locationHint: {
    color: colors.text,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
});
