import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { resolveMediaUrl } from "@/api/media";
import type { ListingCard as ListingCardType } from "@/api/types";
import { isoToBrazilianDate } from "@/features/listings/input-formatters";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

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
    ? (propertyLabels[listing.accommodation.propertyType] ??
      listing.accommodation.propertyType)
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
            <Text style={styles.placeholderIcon}>⌂</Text>
            <Text style={styles.placeholderText}>Foto em breve</Text>
          </View>
        )}
        {propertyLabel ? (
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{propertyLabel}</Text>
          </View>
        ) : null}
        <View style={styles.trustBadge}>
          <Text style={styles.trustBadgeText}>✓ {listing.trustScore}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(listing.pricing.monthlyPriceCents)}
          </Text>
          {listing.pricing.monthlyPriceCents !== null ? (
            <Text style={styles.perMonth}>/mês</Text>
          ) : null}
        </View>

        <Text numberOfLines={1} style={styles.location}>
          ⌖ {location || "Localização aproximada"}
        </Text>

        {configuration || availableFrom ? (
          <Text numberOfLines={1} style={styles.detail}>
            {[configuration, availableFrom ? `Disponível ${availableFrom}` : null]
              .filter(Boolean)
              .join(" · ")}
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
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: 1.7,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  placeholderIcon: {
    color: colors.primary,
    fontSize: 28,
  },
  placeholderText: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
  },
  photoBadge: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  photoBadgeText: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  trustBadge: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  trustBadgeText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
  },
  body: {
    gap: 6,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  price: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 19,
  },
  perMonth: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  location: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  detail: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },
});
