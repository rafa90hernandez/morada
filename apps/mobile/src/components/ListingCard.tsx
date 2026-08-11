import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListingCard as ListingCardType } from '@/api/types';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  listing: ListingCardType;
  onPress: () => void;
};

function formatPrice(cents: number | null) {
  if (cents === null) return 'Preço a confirmar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ListingCard({ listing, onPress }: Props) {
  const location = [listing.location.area, listing.location.city]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir anúncio ${listing.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {listing.coverPhoto ? (
        <Image
          accessibilityLabel={`Foto de ${listing.title}`}
          source={{ uri: listing.coverPhoto.url }}
          style={styles.image}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>Sem foto</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>
        <Text style={styles.location}>{location || 'Localização aproximada'}</Text>
        <Text style={styles.price}>{formatPrice(listing.pricing.monthlyPriceCents)}/mês</Text>

        <View style={styles.metaRow}>
          {listing.accommodation.furnished === true ? (
            <Text style={styles.badge}>Mobilado</Text>
          ) : null}
          {listing.suitability.couplesAllowed === true ? (
            <Text style={styles.badge}>Casais</Text>
          ) : null}
          {listing.suitability.petsAllowed === true ? (
            <Text style={styles.badge}>Pets</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: '100%',
    aspectRatio: 1.55,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
  },
  body: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  location: {
    color: colors.textMuted,
    fontSize: 14,
  },
  price: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
  },
});
