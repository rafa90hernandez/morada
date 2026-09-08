import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getListingOwnerLocation,
  setListingPrivateLocation,
} from "@/api/owner-listings";
import { BrandHeader } from "@/components/BrandHeader";
import { AppButton } from "@/components/ui/AppButton";
import {
  irelandCitySuggestions,
  matchingSuggestions,
} from "@/features/listings/location-suggestions";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

export default function ListingLocationScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { session, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [city, setCity] = useState("");
  const [cityFocused, setCityFocused] = useState(false);
  const [area, setArea] = useState("");
  const [county, setCounty] = useState("");
  const [postalDistrict, setPostalDistrict] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [eircode, setEircode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [approximateText, setApproximateText] = useState<string | null>(null);

  const citySuggestions = useMemo(
    () => matchingSuggestions(city, irelandCitySuggestions),
    [city],
  );

  const load = useCallback(async () => {
    if (!session || !id) {
      if (!session) router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const location = await getListingOwnerLocation(id, session.accessToken);
      setCity(location.city ?? "");
      setArea(location.area ?? "");
      setCounty(location.county ?? "");
      setPostalDistrict(location.postalDistrict ?? "");
      setAddressLine1(location.private?.addressLine1 ?? "");
      setAddressLine2(location.private?.addressLine2 ?? "");
      setEircode(location.private?.eircode ?? "");
      setLatitude(
        location.private ? String(location.private.exactLatitude) : "",
      );
      setLongitude(
        location.private ? String(location.private.exactLongitude) : "",
      );
      setApproximateText(
        location.approximate
          ? `O público verá apenas uma área aproximada de ${location.approximate.radiusMeters} m.`
          : null,
      );
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      if ((caught as Error & { status?: number }).status === 404) {
        setLoading(false);
        return;
      }
      setError("Não foi possível carregar a localização.");
    } finally {
      setLoading(false);
    }
  }, [id, session, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!session || !id) return;
    const exactLatitude = Number(latitude.replace(",", "."));
    const exactLongitude = Number(longitude.replace(",", "."));
    if (
      !city.trim() ||
      !area.trim() ||
      !county.trim() ||
      !addressLine1.trim()
    ) {
      setError("Informe cidade, área, county e endereço.");
      return;
    }
    if (!Number.isFinite(exactLatitude) || !Number.isFinite(exactLongitude)) {
      setError("Informe latitude e longitude válidas.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const location = await setListingPrivateLocation(
        id,
        {
          city: city.trim(),
          area: area.trim(),
          county: county.trim(),
          postalDistrict: postalDistrict.trim() || undefined,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          eircode: eircode.trim() || undefined,
          exactLatitude,
          exactLongitude,
        },
        session.accessToken,
      );
      setApproximateText(
        location.approximate
          ? `O público verá apenas uma área aproximada de ${location.approximate.radiusMeters} m.`
          : null,
      );
      setSaved(true);
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError(
        "Não foi possível salvar a localização. Confira os dados e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando localização...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <BrandHeader compact />
        <Text style={styles.stepLabel}>2 de 2</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Localização aproximada
        </Text>
        <Text style={styles.muted}>
          Mantemos o endereço exato em sigilo. Para quem explora o Morada,
          mostramos apenas uma área aproximada.
        </Text>
      </View>

      <View style={styles.privacyCard}>
        <View style={styles.privacyIcon}>
          <Text style={styles.privacyIconText}>⌂</Text>
        </View>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Sua privacidade importa</Text>
          <Text style={styles.privacyText}>
            O endereço completo só pode ser usado nos fluxos privados previstos
            pelo produto. A busca pública continua aproximada.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Cidade</Text>
          <TextInput
            accessibilityLabel="Cidade"
            autoCapitalize="words"
            onBlur={() => setCityFocused(false)}
            onChangeText={setCity}
            onFocus={() => setCityFocused(true)}
            placeholder="Ex.: Dublin"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={city}
          />
          {cityFocused && citySuggestions.length > 0 ? (
            <View style={styles.suggestionList}>
              {citySuggestions.map((suggestion) => (
                <Pressable
                  accessibilityRole="button"
                  key={suggestion}
                  onPress={() => {
                    setCity(suggestion);
                    setCityFocused(false);
                  }}
                  style={styles.suggestionItem}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <Field label="Área / bairro" value={area} onChangeText={setArea} />
        <Field label="County" value={county} onChangeText={setCounty} />
        <Field
          label="Distrito postal"
          value={postalDistrict}
          onChangeText={setPostalDistrict}
        />
        <Field
          label="Endereço exato"
          value={addressLine1}
          onChangeText={setAddressLine1}
        />
        <Field
          label="Complemento"
          value={addressLine2}
          onChangeText={setAddressLine2}
        />
        <Field
          label="Eircode"
          autoCapitalize="characters"
          value={eircode}
          onChangeText={setEircode}
        />

        <Text style={styles.coordinatesTitle}>Coordenadas privadas</Text>
        <View style={styles.coordinateRow}>
          <Field
            label="Latitude"
            keyboardType="numbers-and-punctuation"
            value={latitude}
            onChangeText={setLatitude}
          />
          <Field
            label="Longitude"
            keyboardType="numbers-and-punctuation"
            value={longitude}
            onChangeText={setLongitude}
          />
        </View>

        {approximateText ? (
          <View style={styles.approximateBox}>
            <Text style={styles.approximateText}>✓ {approximateText}</Text>
          </View>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            Localização salva.
          </Text>
        ) : null}
        <AppButton
          disabled={saving}
          label={saving ? "Salvando..." : "Concluir localização"}
          onPress={() => void save()}
        />
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  progressTrack: {
    height: 5,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  progressFill: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primary,
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  privacyIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: colors.surface,
  },
  privacyIconText: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: "900",
  },
  privacyCopy: {
    flex: 1,
    gap: 2,
  },
  privacyTitle: {
    color: colors.primaryPressed,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  privacyText: {
    color: colors.primaryPressed,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  field: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 15,
  },
  suggestionList: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  suggestionItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
  },
  coordinatesTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  coordinateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  approximateBox: {
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  approximateText: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
  success: {
    color: colors.success,
    fontFamily: fontFamily.bold,
  },
});
