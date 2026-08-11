import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MapMarker } from '@/api/types';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  markers: MapMarker[];
  onMarkerPress: (listingId: string) => void;
};

function normalize(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

export function ApproximateMap({ markers, onMarkerPress }: Props) {
  if (markers.length === 0) {
    return (
      <View style={[styles.map, styles.empty]}>
        <Text style={styles.emptyTitle}>Nenhum anúncio nesta área</Text>
        <Text style={styles.emptyText}>Mova a área de busca ou ajuste os filtros.</Text>
      </View>
    );
  }

  const latitudes = markers.map((marker) => marker.position.latitude);
  const longitudes = markers.map((marker) => marker.position.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return (
    <View
      accessibilityLabel="Mapa esquemático com localizações aproximadas dos anúncios"
      style={styles.map}
    >
      <View style={styles.notice}>
        <Text style={styles.noticeText}>Localizações aproximadas</Text>
      </View>
      {markers.map((marker) => {
        const x = normalize(marker.position.longitude, minLng, maxLng);
        const y = 1 - normalize(marker.position.latitude, minLat, maxLat);

        return (
          <Pressable
            accessibilityLabel={`Abrir ${marker.label.title}`}
            accessibilityRole="button"
            key={marker.listingId}
            onPress={() => onMarkerPress(marker.listingId)}
            style={[
              styles.marker,
              {
                left: `${8 + x * 80}%`,
                top: `${16 + y * 68}%`,
              },
            ]}
          >
            <Text style={styles.markerText}>€</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    minHeight: 420,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: '#E8EEE9',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  notice: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  marker: {
    position: 'absolute',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  markerText: {
    color: colors.surface,
    fontWeight: '900',
  },
});
