import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
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
import { isoToBrazilianDate } from "@/features/listings/input-formatters";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const propertyLabels: Record<string, string> = {
  SINGLE_ROOM: "Quarto individual",
  SHARED_ROOM: "Quarto compartilhado",
  STUDIO: "Studio",
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  BED_SPACE: "Vaga em quarto",
  OTHER: "Outro",
};

function price(cents: number | null) {
  if (cents === null) return "Preço a confirmar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function yesNo(value: boolean | null) {
  if (value === null) return null;
  return value ? "Sim" : "Não";
}

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    void getListingDetail(params.id)
      .then((result) => {
        if (active) {
          setListing(result);
          setSelectedPhotoId(result.photos[0]?.id ?? null);
        }
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
        if (active) {
          setFavoriteError("Não foi possível consultar seus favoritos.");
        }
      });

    return () => {
      active = false;
    };
  }, [params.id, session]);

  const selectedPhoto = useMemo(() => {
    if (!listing?.photos.length) return null;
    return (
      listing.photos.find((photo) => photo.id === selectedPhotoId) ??
      listing.photos[0]
    );
  }, [listing, selectedPhotoId]);

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
  const propertyLabel = listing.accommodation.propertyType
    ? (propertyLabels[listing.accommodation.propertyType] ??
      listing.accommodation.propertyType)
    : null;
  const availableFrom = isoToBrazilianDate(listing.availability.availableFrom);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {selectedPhoto ? (
        <View style={styles.gallery}>
          <Image
            accessibilityLabel={`Foto de ${listing.title}`}
            resizeMode="cover"
            source={{ uri: resolveMediaUrl(selectedPhoto.url) }}
            style={styles.hero}
          />
          {listing.photos.length > 1 ? (
            <ScrollView
              contentContainerStyle={styles.thumbnailRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {listing.photos.map((photo, index) => {
                const selected = photo.id === selectedPhoto.id;
                return (
                  <Pressable
                    accessibilityLabel={`Visualizar foto ${index + 1}`}
                    accessibilityRole="button"
                    key={photo.id}
                    onPress={() => setSelectedPhotoId(photo.id)}
                    style={[
                      styles.thumbnailButton,
                      selected && styles.thumbnailButtonSelected,
                    ]}
                  >
                    <Image
                      resizeMode="cover"
                      source={{ uri: resolveMediaUrl(photo.url) }}
                      style={styles.thumbnail}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.muted}>Fotos ainda não disponíveis.</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.badgeRow}>
          {propertyLabel ? (
            <Text style={styles.badge}>{propertyLabel}</Text>
          ) : null}
          <Text style={styles.trustBadge}>Confiança {listing.trustScore}</Text>
        </View>
        <Text style={styles.eyebrow}>
          {location || "Localização aproximada"}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {listing.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {price(listing.pricing.monthlyPriceCents)}
          </Text>
          {listing.pricing.monthlyPriceCents !== null ? (
            <Text style={styles.perMonth}>/ mês</Text>
          ) : null}
        </View>
        {availableFrom ? (
          <Text style={styles.availability}>
            Disponível a partir de {availableFrom}
          </Text>
        ) : null}
        <Text style={styles.description}>{listing.description}</Text>

        {favoriteError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {favoriteError}
          </Text>
        ) : null}
        <View style={styles.actionRow}>
          <View style={styles.actionButton}>
            <AppButton
              disabled={favoriteLoading}
              label={
                favoriteLoading
                  ? "Atualizando..."
                  : favorite
                    ? "Favoritado"
                    : session
                      ? "Favoritar"
                      : "Entrar para favoritar"
              }
              onPress={() => void toggleFavorite()}
              variant="secondary"
            />
          </View>
          <View style={styles.actionButton}>
            <AppButton
              label={session ? "Denunciar" : "Entrar para denunciar"}
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
          </View>
        </View>
      </View>

      <View style={styles.trustCard}>
        <Text style={styles.sectionTitle}>Confiança e verificações</Text>
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
          Verificações ajudam a reduzir incertezas, mas não representam garantia
          absoluta de segurança ou fechamento do aluguel.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sobre a moradia</Text>
        <InfoRow label="Tipo" value={propertyLabel} />
        <InfoRow label="Quartos" value={listing.accommodation.bedroomCount} />
        <InfoRow
          label="Banheiros"
          value={listing.accommodation.bathroomCount}
        />
        <InfoRow
          label="Espaço"
          value={
            listing.accommodation.advertisedSpaceType === "PRIVATE"
              ? "Privado"
              : listing.accommodation.advertisedSpaceType === "SHARED"
                ? "Compartilhado"
                : null
          }
        />
        <InfoRow
          label="Banheiro"
          value={
            listing.accommodation.bathroomType === "PRIVATE"
              ? "Privado"
              : listing.accommodation.bathroomType === "SHARED"
                ? "Compartilhado"
                : null
          }
        />
        <InfoRow
          label="Mobiliado"
          value={yesNo(listing.accommodation.furnished)}
        />
        <InfoRow
          label="Estadia mínima"
          value={
            listing.availability.minimumStayDays
              ? `${listing.availability.minimumStayDays} dias`
              : null
          }
        />
      </View>

      {listing.advertiser ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quem está anunciando</Text>
          <Text style={styles.advertiserName}>
            {listing.advertiser.displayName}
          </Text>
          {listing.advertiser.nationality ? (
            <Text style={styles.mutedLeft}>
              Nacionalidade: {listing.advertiser.nationality}
            </Text>
          ) : null}
          {listing.advertiser.hometown ? (
            <Text style={styles.mutedLeft}>
              Cidade de origem: {listing.advertiser.hometown}
            </Text>
          ) : null}
        </View>
      ) : null}

      {listing.transport.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Transporte próximo</Text>
          {listing.transport.map((option) => (
            <View key={option.id} style={styles.transportRow}>
              <Text style={styles.transportMode}>{option.mode}</Text>
              <View style={styles.transportText}>
                <Text style={styles.rowValue}>
                  {[option.stopName, option.lineName]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {option.walkingMinutes !== null ? (
                  <Text style={styles.mutedLeft}>
                    Aproximadamente {option.walkingMinutes} min a pé
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Localização e privacidade</Text>
        <Text style={styles.mutedLeft}>
          Por privacidade, o Morada mostra apenas uma área aproximada antes de
          uma visita aceita. O endereço exato não aparece neste anúncio.
        </Text>
        {listing.location.approximate ? (
          <Text style={styles.locationHint}>
            Área aproximada em um raio de{" "}
            {listing.location.approximate.radiusMeters} m
          </Text>
        ) : null}
      </View>

      <View style={styles.contactCard}>
        <Text style={styles.sectionTitle}>Interessado nesta moradia?</Text>
        <Text style={styles.mutedLeft}>
          Fale com o anunciante sem sair do Morada. A conversa permanece ligada
          a este anúncio e pode ser usada para combinar uma visita.
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
  gallery: {
    gap: spacing.sm,
  },
  hero: {
    width: "100%",
    aspectRatio: 1.35,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  thumbnailButton: {
    overflow: "hidden",
    width: 76,
    height: 58,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: radius.md,
  },
  thumbnailButtonSelected: {
    borderColor: colors.primary,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surfaceMuted,
  },
  section: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: "800",
  },
  trustBadge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  perMonth: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  availability: {
    color: colors.primary,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 150,
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
  advertiserName: {
    color: colors.text,
    fontSize: 17,
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
  transportRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  transportMode: {
    minWidth: 58,
    color: colors.primary,
    fontWeight: "800",
  },
  transportText: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
});
