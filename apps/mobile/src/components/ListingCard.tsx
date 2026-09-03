import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { resolveMediaUrl } from "@/api/media";
import type { ListingCard as ListingCardType } from "@/api/types";
import { isoToBrazilianDate } from "@/features/listings/input-formatters";
import { colors, radius, spacing } from "@/theme/tokens";

type Props = {
  listing: ListingCardType;
  onPress: () => void;
};

const propertyLabels: Record<string, string> = {
  SINGLE_ROOM: "Quarto individual",
  SHARED_ROOM: "Quarto compartilhado",
  STUDIO: "Studio",
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  BED_SPACE: "Vaga em quarto",
  OTHER: "Outro",
};

function formatPrice(cents: number | null) {
  if (cents === null) return "Preço a confirmar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function billsLabel(value: string | null) {
  if (value === "YES") return "Contas incluídas";
  if (value === "PARTIAL") return "Contas parciais";
  if (value === "NO") return "Contas à parte";
  return null;
}

export function ListingCard({ listing, onPress }: Props) {
  const location = [listing.location.area, listing.location.city]
    .filter(Boolean)
    .join(" · ");
  const propertyLabel = listing.accommodation.propertyType
    ? propertyLabels[listing.accommodation.propertyType] ??
      listing.accommodation.propertyType
    : null;
  const bills = billsLabel(listing.pricing.billsIncludedType);
  const availableFrom = isoToBrazilianDate(listing.availability.availableFrom);
  const configuration = [
    listing.accommodation.bedroomCount !== null
      ? `${listing.accommodation.bedroomCount} quarto${
          listing.accommodation.bedroomCount === 1 ? "" : "s"
        }`
      : null,
    listing.accommodation.bathroomCount !== null
      ? `${listing.accommodation.bathroomCount} banheiro${
          listing.accommodation.bathroomCount === 1 ? "" : "s"
        }`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir anúncio ${listing.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {listing.coverPhoto ? (
          <Image
            accessibilityLabel={`Foto de ${listing.title}`}
            resizeMode="cover"
            source={{ uri: resolveMediaUrl(listing.coverPhoto.url) }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>Foto em breve</Text>
          </View>
        )}
        {propertyLabel ? (
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{propertyLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text numberOfLines={2} style={styles.title}>
              {listing.title}
            </Text>
            <Text style={styles.location}>
              {location || "Localização aproximada"}
            </Text>
          </View>
          <Text style={styles.trust}>Confiança {listing.trustScore}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(listing.pricing.monthlyPriceCents)}
          </Text>
          {listing.pricing.monthlyPriceCents !== null ? (
            <Text style={styles.perMonth}>/ mês</Text>
          ) : null}
        </View>

        {configuration ? (
          <Text style={styles.detail}>{configuration}</Text>
        ) : null}
        {availableFrom ? (
          <Text style={styles.detail}>
            Disponível a partir de {availableFrom}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {bills ? <Text style={styles.badge}>{bills}</Text> : null}
          {listing.accommodation.furnished === true ? (
            <Text style={styles.badge}>Mobiliado</Text>
          ) : null}
          {listing.suitability.couplesAllowed === true ? (
            <Text style={styles.badge}>Aceita casais</Text>
          ) : null}
          {listing.suitability.petsAllowed === true ? (
            <Text style={styles.badge}>Aceita pets</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.88,
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: 1.45,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  photoBadge: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  location: {
    color: colors.textMuted,
    fontSize: 14,
  },
  trust: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  perMonth: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  detail: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
  },
});
