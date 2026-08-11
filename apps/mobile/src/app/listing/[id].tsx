import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getListingDetail } from '@/api/client';
import type { ListingDetail } from '@/api/types';
import { AppButton } from '@/components/ui/AppButton';
import { colors, radius, spacing } from '@/theme/tokens';

function price(cents: number | null) {
  if (cents === null) return 'Preço a confirmar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          Ele pode ter expirado, sido encerrado ou ficado temporariamente indisponível.
        </Text>
      </View>
    );
  }

  const location = [listing.location.area, listing.location.city]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {listing.photos[0] ? (
        <Image
          accessibilityLabel={`Foto de ${listing.title}`}
          source={{ uri: listing.photos[0].url }}
          style={styles.hero}
        />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.eyebrow}>{location || 'Localização aproximada'}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{price(listing.pricing.monthlyPriceCents)}/mês</Text>
        <Text style={styles.description}>{listing.description}</Text>
      </View>

      <View style={styles.trustCard}>
        <Text style={styles.sectionTitle}>O que o Morada verificou</Text>
        <TrustRow label="Identidade do anunciante" value={listing.trust.identityVerified} />
        <TrustRow label="Vínculo com o imóvel" value={listing.trust.relationshipVerified} />
        <TrustRow
          label="Autorização do landlord"
          value={listing.trust.landlordAuthorization.status === 'VERIFIED'}
        />
        <Text style={styles.trustNote}>
          Verificações reduzem incertezas, mas não significam garantia absoluta de segurança ou de fechamento do aluguel.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sobre a moradia</Text>
        <InfoRow label="Tipo" value={listing.accommodation.propertyType} />
        <InfoRow label="Quartos" value={listing.accommodation.bedroomCount} />
        <InfoRow label="Banheiros" value={listing.accommodation.bathroomCount} />
        <InfoRow
          label="Mobilado"
          value={listing.accommodation.furnished === null ? null : listing.accommodation.furnished ? 'Sim' : 'Não'}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Localização</Text>
        <Text style={styles.muted}>
          Por privacidade, o Morada mostra apenas uma área aproximada antes do contato com o anunciante.
        </Text>
        {listing.location.approximate ? (
          <Text style={styles.locationHint}>
            Precisão aproximada: raio de {listing.location.approximate.radiusMeters} m
          </Text>
        ) : null}
      </View>

      <AppButton
        disabled
        label="Entrar para salvar"
        accessibilityHint="Favoritos serão ativados quando a sessão autenticada do aplicativo estiver conectada"
      />
      <Text style={styles.favoriteNote}>
        A API de favoritos já está pronta; o botão permanece desabilitado até o fluxo de autenticação mobile ser conectado.
      </Text>
    </ScrollView>
  );
}

function TrustRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, value ? styles.verified : styles.notVerified]}>
        {value ? 'Verificado' : 'Não verificado'}
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  hero: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  section: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  price: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
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
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 32,
  },
  rowLabel: {
    flex: 1,
    color: colors.textMuted,
  },
  rowValue: {
    color: colors.text,
    fontWeight: '700',
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
    textAlign: 'center',
    lineHeight: 22,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  locationHint: {
    color: colors.text,
    fontWeight: '700',
  },
  favoriteNote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
