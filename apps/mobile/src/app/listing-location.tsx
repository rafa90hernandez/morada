import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  getListingOwnerLocation,
  setListingPrivateLocation,
} from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

export default function ListingLocationScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { session, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [county, setCounty] = useState("");
  const [postalDistrict, setPostalDistrict] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [eircode, setEircode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [approximateText, setApproximateText] = useState<string | null>(null);

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
      setLatitude(location.private ? String(location.private.exactLatitude) : "");
      setLongitude(location.private ? String(location.private.exactLongitude) : "");
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
    if (!city.trim() || !area.trim() || !county.trim() || !addressLine1.trim()) {
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
      setError("Não foi possível salvar a localização. Confira os dados e tente novamente.");
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
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>Localização privada</Text>
        <Text style={styles.muted}>
          O endereço e as coordenadas exatas ficam restritos. O backend deriva uma localização pública aproximada separada.
        </Text>
        <Text style={styles.warning}>
          Alterar a localização de um anúncio já aprovado é uma mudança crítica e pode enviá-lo novamente para análise.
        </Text>
      </View>

      <View style={styles.card}>
        <Field label="Cidade" value={city} onChangeText={setCity} />
        <Field label="Área / bairro" value={area} onChangeText={setArea} />
        <Field label="County" value={county} onChangeText={setCounty} />
        <Field label="Distrito postal" value={postalDistrict} onChangeText={setPostalDistrict} />
        <Field label="Endereço" value={addressLine1} onChangeText={setAddressLine1} />
        <Field label="Complemento" value={addressLine2} onChangeText={setAddressLine2} />
        <Field label="Eircode" autoCapitalize="characters" value={eircode} onChangeText={setEircode} />
        <Field label="Latitude exata" keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} />
        <Field label="Longitude exata" keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} />
        {approximateText ? <Text style={styles.helper}>{approximateText}</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {saved ? <Text accessibilityLiveRegion="polite" style={styles.success}>Localização salva.</Text> : null}
        <AppButton disabled={saving} label={saving ? "Salvando..." : "Salvar localização"} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  muted: { color: colors.textMuted, lineHeight: 21 },
  helper: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  warning: { color: colors.warning, lineHeight: 20 },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontWeight: "700" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md },
  error: { color: colors.danger, lineHeight: 20 },
  success: { color: colors.success, fontWeight: "700" },
});
