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
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

const propertyLabels: Record<string, string> = {
  SINGLE_ROOM: "Quarto individual",
  SHARED_ROOM: "Quarto compartilhado",
  STUDIO: "Studio",
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  BED_SPACE: "Vaga em quarto",
  OTHER: "Outro",
};

const amenityLabels: Record<string, string> = {
  FRIDGE: "Geladeira",
  FREEZER: "Freezer",
  OVEN: "Forno",
  HOB: "Fogão",
  MICROWAVE: "Micro-ondas",
  DISHWASHER: "Lava-louças",
  KETTLE: "Chaleira",
  BALCONY: "Varanda",
  GARDEN: "Jardim",
  YARD: "Quintal",
  TERRACE: "Terraço",
  SHARED_OUTDOOR_SPACE: "Área externa compartilhada",
};

function price(cents: number | null) {
  if (cents === null) return "Preço a confirmar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function money(cents: number | null) {
  return cents === null ? null : price(cents);
}

function yesNo(value: boolean | null) {
  if (value === null) return null;
  return value ? "Sim" : "Não";
}

function humanize(value: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const availableUntil = isoToBrazilianDate(
    listing.availabilityDetail.availableUntil,
  );
  const amenities = [
    ...listing.amenities.kitchen,
    ...listing.amenities.outdoor,
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.galleryWrap}>
        {selectedPhoto ? (
          <View style={styles.gallery}>
            <Image
              accessibilityLabel={`Foto de ${listing.title}`}
              resizeMode="cover"
              source={{ uri: resolveMediaUrl(selectedPhoto.url) }}
              style={styles.hero}
            />
            <View style={styles.heroControls}>
              <Pressable
                accessibilityLabel="Voltar"
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.heroControl,
                  pressed && styles.heroControlPressed,
                ]}
              >
                <Text style={styles.backSymbol}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={favorite ? "Remover dos favoritos" : "Favoritar"}
                accessibilityRole="button"
                disabled={favoriteLoading}
                onPress={() => void toggleFavorite()}
                style={({ pressed }) => [
                  styles.heroControl,
                  pressed && styles.heroControlPressed,
                ]}
              >
                <Text style={[styles.favoriteSymbol, favorite && styles.favoriteSymbolActive]}>
                  {favorite ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {Math.max(
                  1,
                  listing.photos.findIndex((photo) => photo.id === selectedPhoto.id) + 1,
                )}
                /{listing.photos.length}
              </Text>
            </View>
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
            <Pressable
              accessibilityLabel="Voltar"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.placeholderBack}
            >
              <Text style={styles.backSymbol}>‹</Text>
            </Pressable>
            <Text style={styles.muted}>Fotos ainda não disponíveis.</Text>
          </View>
        )}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.badgeRow}>
          {propertyLabel ? <Text style={styles.badge}>{propertyLabel}</Text> : null}
          <Text style={styles.trustBadge}>✓ Confiança {listing.trustScore}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {listing.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{price(listing.pricing.monthlyPriceCents)}</Text>
          {listing.pricing.monthlyPriceCents !== null ? (
            <Text style={styles.perMonth}>/mês</Text>
          ) : null}
        </View>
        <Text style={styles.locationText}>
          ⌖ {location || "Localização aproximada"}
        </Text>
        {availableFrom ? (
          <Text style={styles.availability}>Disponível a partir de {availableFrom}</Text>
        ) : null}

        <View style={styles.quickFacts}>
          <QuickFact
            icon="▣"
            label={
              listing.accommodation.advertisedSpaceType === "PRIVATE"
                ? "Quarto privado"
                : listing.accommodation.advertisedSpaceType === "SHARED"
                  ? "Compartilhado"
                  : "Moradia"
            }
          />
          <QuickFact
            icon="◉"
            label={
              listing.accommodation.bathroomType === "PRIVATE"
                ? "Banheiro privado"
                : listing.accommodation.bathroomType === "SHARED"
                  ? "Banheiro compartilhado"
                  : "Banheiro"
            }
          />
          <QuickFact
            icon="♙"
            label={
              listing.household.currentResidentCount !== null
                ? `${listing.household.currentResidentCount} moradores`
                : "Moradores"
            }
          />
        </View>

        <Text style={styles.description}>{listing.description}</Text>
        {favoriteError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {favoriteError}
          </Text>
        ) : null}
      </View>

      <View style={styles.trustCard}>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.trustIcon}>
            <Text style={styles.trustIconText}>✓</Text>
          </View>
          <Text style={styles.sectionTitle}>Confiança e verificações</Text>
        </View>
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
        <InfoRow label="Banheiros" value={listing.accommodation.bathroomCount} />
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
        <InfoRow label="Tipo de quarto" value={humanize(listing.space.roomType)} />
        <InfoRow label="Tipo de cama" value={humanize(listing.space.bedType)} />
        <InfoRow label="Máximo de ocupantes" value={listing.space.maxOccupants} />
        <InfoRow label="Mobiliado" value={yesNo(listing.accommodation.furnished)} />
        <InfoRow label="Andar" value={listing.property.floorNumber} />
        <InfoRow label="Elevador" value={yesNo(listing.property.hasLift)} />
        <InfoRow label="Aquecimento" value={humanize(listing.property.heatingType)} />
        <InfoRow
          label="Estadia mínima"
          value={
            listing.availability.minimumStayDays
              ? `${listing.availability.minimumStayDays} dias`
              : null
          }
        />
        <InfoRow label="Disponível até" value={availableUntil} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Casa e convivência</Text>
        <InfoRow label="Moradores atuais" value={listing.household.currentResidentCount} />
        <InfoRow label="Compartilham o espaço" value={listing.space.peopleSharingSpace} />
        <InfoRow
          label="Compartilham o banheiro"
          value={listing.space.peopleSharingBathroom}
        />
        <InfoRow
          label="Composição da casa"
          value={humanize(listing.household.genderComposition)}
        />
        <InfoRow
          label="Landlord mora no imóvel"
          value={yesNo(listing.household.landlordLivesHere)}
        />
        <InfoRow label="Aceita casais" value={yesNo(listing.suitability.couplesAllowed)} />
        <InfoRow
          label="Aceita famílias"
          value={yesNo(listing.household.childrenFamiliesAllowed)}
        />
        <InfoRow
          label="Aceita estudantes"
          value={yesNo(listing.household.studentsAllowed)}
        />
        <InfoRow label="Aceita pets" value={yesNo(listing.suitability.petsAllowed)} />
        <InfoRow
          label="Permite fumar"
          value={yesNo(listing.suitability.smokingAllowed)}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Custos e condições</Text>
        <InfoRow label="Aluguel mensal" value={money(listing.pricing.monthlyPriceCents)} />
        <InfoRow label="Depósito" value={money(listing.pricingDetail.depositAmountCents)} />
        <InfoRow
          label="Contas mensais estimadas"
          value={money(listing.pricingDetail.estimatedMonthlyBillsCents)}
        />
        <InfoRow
          label="Aluguel adiantado"
          value={money(listing.pricingDetail.firstRentAdvanceCents)}
        />
        {listing.pricingDetail.extraCostsNote ? (
          <Text style={styles.note}>{listing.pricingDetail.extraCostsNote}</Text>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Requisitos</Text>
        <InfoRow label="Contrato formal" value={yesNo(listing.requirements.formalContract)} />
        <InfoRow
          label="Aprovação do landlord"
          value={yesNo(listing.requirements.landlordApprovalRequired)}
        />
        <InfoRow
          label="Comprovante de renda"
          value={yesNo(listing.requirements.proofOfIncomeRequired)}
        />
        <InfoRow
          label="Comprovante de emprego"
          value={yesNo(listing.requirements.proofOfEmploymentRequired)}
        />
        <InfoRow
          label="Referência anterior"
          value={yesNo(listing.requirements.priorReferenceRequired)}
        />
        {listing.requirements.otherRequirementsNote ? (
          <Text style={styles.note}>{listing.requirements.otherRequirementsNote}</Text>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Comodidades</Text>
        <InfoRow label="Internet" value={yesNo(listing.connectivity.internetAvailable)} />
        <InfoRow label="Wi-Fi" value={yesNo(listing.connectivity.wifiAvailable)} />
        <InfoRow
          label="Internet incluída"
          value={yesNo(listing.connectivity.internetIncludedInBills)}
        />
        <InfoRow
          label="Velocidade da internet"
          value={
            listing.connectivity.internetSpeedMbps
              ? `${listing.connectivity.internetSpeedMbps} Mbps`
              : null
          }
        />
        <InfoRow label="Máquina de lavar" value={yesNo(listing.laundry.washingMachine)} />
        <InfoRow label="Secadora" value={yesNo(listing.laundry.dryer)} />
        <InfoRow label="Estacionamento para carro" value={yesNo(listing.parking.car)} />
        <InfoRow
          label="Estacionamento para bicicleta"
          value={yesNo(listing.parking.bicycle)}
        />
        {amenities.length > 0 ? (
          <View style={styles.chipRow}>
            {amenities.map((amenity) => (
              <Text key={amenity} style={styles.amenityChip}>
                {amenityLabels[amenity] ?? humanize(amenity)}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Regras da casa</Text>
        <InfoRow label="Festas" value={yesNo(listing.rules.partiesAllowed)} />
        <InfoRow label="Visitantes" value={yesNo(listing.rules.visitorsAllowed)} />
        {listing.rules.quietHoursNote ? (
          <Text style={styles.note}>Horário de silêncio: {listing.rules.quietHoursNote}</Text>
        ) : null}
        {listing.rules.houseRules ? <Text style={styles.note}>{listing.rules.houseRules}</Text> : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Acessibilidade</Text>
        <InfoRow
          label="Acesso sem degraus"
          value={yesNo(listing.accessibility.stepFreeAccess)}
        />
        <InfoRow
          label="Entrada acessível"
          value={yesNo(listing.accessibility.accessibleEntrance)}
        />
        <InfoRow
          label="Banheiro adaptado"
          value={yesNo(listing.accessibility.adaptedBathroom)}
        />
        <InfoRow
          label="Espaço para cadeira de rodas"
          value={yesNo(listing.accessibility.wheelchairSpace)}
        />
        <InfoRow
          label="Estacionamento acessível"
          value={yesNo(listing.accessibility.accessibleParking)}
        />
        {listing.accessibility.otherNote ? (
          <Text style={styles.note}>{listing.accessibility.otherNote}</Text>
        ) : null}
      </View>

      {listing.advertiser ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quem está anunciando</Text>
          <View style={styles.advertiserRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {listing.advertiser.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.advertiserCopy}>
              <Text style={styles.advertiserName}>{listing.advertiser.displayName}</Text>
              {listing.advertiser.nationality ? (
                <Text style={styles.mutedLeft}>{listing.advertiser.nationality}</Text>
              ) : null}
              {listing.advertiser.hometown ? (
                <Text style={styles.mutedLeft}>{listing.advertiser.hometown}</Text>
              ) : null}
            </View>
          </View>
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
                  {[option.stopName, option.lineName].filter(Boolean).join(" · ")}
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
            Área aproximada em um raio de {listing.location.approximate.radiusMeters} m
          </Text>
        ) : null}
      </View>

      <View style={styles.contactCard}>
        <View style={styles.contactCopy}>
          <Text style={styles.sectionTitle}>Interessado nesta moradia?</Text>
          <Text style={styles.mutedLeft}>
            Converse com o anunciante dentro do Morada e, se fizer sentido,
            combine uma visita com segurança.
          </Text>
        </View>
        {contactError ? <Text style={styles.error}>{contactError}</Text> : null}
        <AppButton
          disabled={contacting}
          label={
            contacting
              ? "Abrindo conversa..."
              : session
                ? "Conversar com anunciante"
                : "Entrar para conversar"
          }
          onPress={() => void contactAdvertiser()}
        />
        <Pressable
          accessibilityRole="button"
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
          style={styles.reportButton}
        >
          <Text style={styles.reportButtonText}>
            {session ? "Denunciar anúncio" : "Entrar para denunciar"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function QuickFact({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.quickFact}>
      <Text style={styles.quickFactIcon}>{icon}</Text>
      <Text numberOfLines={2} style={styles.quickFactLabel}>
        {label}
      </Text>
    </View>
  );
}

function TrustRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, value ? styles.verified : styles.notVerified]}>
        {value ? "✓ Verificado" : "Não verificado"}
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
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  galleryWrap: {
    backgroundColor: colors.surface,
  },
  gallery: {
    position: "relative",
    gap: spacing.sm,
  },
  hero: {
    width: "100%",
    aspectRatio: 1.25,
    backgroundColor: colors.surfaceMuted,
  },
  heroPlaceholder: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroControls: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroControl: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.94)",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  heroControlPressed: {
    opacity: 0.75,
  },
  placeholderBack: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  backSymbol: {
    marginTop: -3,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 32,
    lineHeight: 34,
  },
  favoriteSymbol: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 30,
  },
  favoriteSymbolActive: {
    color: colors.danger,
  },
  photoCounter: {
    position: "absolute",
    right: spacing.md,
    bottom: 72,
    borderRadius: radius.pill,
    backgroundColor: "rgba(13,27,43,0.72)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  photoCounterText: {
    color: colors.surface,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  thumbnailRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
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
  summaryCard: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
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
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  trustBadge: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.7,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
  },
  perMonth: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  locationText: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  availability: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  description: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.xs,
  },
  quickFacts: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quickFact: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  quickFactIcon: {
    color: colors.primary,
    fontSize: 18,
  },
  quickFactLabel: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  trustIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  trustIconText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
  },
  trustCard: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
  },
  sectionCard: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  advertiserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
  },
  advertiserCopy: {
    flex: 1,
    gap: 2,
  },
  advertiserName: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
  },
  row: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowLabel: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
  rowValue: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
    textAlign: "right",
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
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  amenityChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: "center",
    lineHeight: 22,
  },
  mutedLeft: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
  },
  locationHint: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
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
    fontFamily: fontFamily.extraBold,
  },
  transportText: {
    flex: 1,
    gap: 2,
  },
  contactCard: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  contactCopy: {
    gap: spacing.xs,
  },
  reportButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  reportButtonText: {
    color: colors.danger,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.semibold,
    lineHeight: 20,
  },
});
