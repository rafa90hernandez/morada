import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import {
  createListing,
  getMyListing,
  updateListing,
  type OwnerListingInput,
  type OwnerListingType,
  type OwnerPropertyType,
} from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const propertyTypes: Array<{ value: OwnerPropertyType; label: string }> = [
  { value: "SINGLE_ROOM", label: "Quarto individual" },
  { value: "SHARED_ROOM", label: "Quarto compartilhado" },
  { value: "STUDIO", label: "Studio" },
  { value: "APARTMENT", label: "Apartamento" },
  { value: "HOUSE", label: "Casa" },
  { value: "BED_SPACE", label: "Vaga em quarto" },
  { value: "OTHER", label: "Outro" },
];

function centsFromEuro(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
}

function optionalInt(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ListingEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === "string" ? params.id : undefined;
  const editing = Boolean(listingId);
  const { session, signOut } = useSession();

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<OwnerListingType>("RENTAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState<OwnerPropertyType>("SINGLE_ROOM");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [minimumStayDays, setMinimumStayDays] = useState("");
  const [furnished, setFurnished] = useState(true);
  const [couplesAllowed, setCouplesAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [familiesAllowed, setFamiliesAllowed] = useState(false);
  const [studentsAllowed, setStudentsAllowed] = useState(true);
  const [formalContract, setFormalContract] = useState(false);
  const [landlordApprovalRequired, setLandlordApprovalRequired] = useState(false);

  const load = useCallback(async () => {
    if (!listingId || !session) return;
    setLoading(true);
    setError(null);
    try {
      const item = await getMyListing(listingId, session.accessToken);
      setType(item.type);
      setTitle(item.title);
      setDescription(item.description);
      setCity(item.location.city ?? "");
      setArea(item.location.area ?? "");
      setPropertyType(item.property.propertyType ?? "SINGLE_ROOM");
      setBedrooms(String(item.property.bedroomCount ?? 1));
      setBathrooms(String(item.property.bathroomCount ?? 1));
      setPrice(item.pricing.monthlyPriceCents === null ? "" : String(item.pricing.monthlyPriceCents / 100));
      setDeposit(item.pricing.depositAmountCents === null ? "" : String(item.pricing.depositAmountCents / 100));
      setAvailableFrom(item.availability.availableFrom?.slice(0, 10) ?? "");
      setMinimumStayDays(item.availability.minimumStayDays === null ? "" : String(item.availability.minimumStayDays));
      setFurnished(Boolean(item.amenities.furnished));
      setCouplesAllowed(Boolean(item.household.couplesAllowed));
      setPetsAllowed(Boolean(item.household.petsAllowed));
      setSmokingAllowed(Boolean(item.household.smokingAllowed));
      setFamiliesAllowed(Boolean(item.household.childrenFamiliesAllowed));
      setStudentsAllowed(Boolean(item.household.studentsAllowed));
      setFormalContract(Boolean(item.requirements.formalContract));
      setLandlordApprovalRequired(Boolean(item.requirements.landlordApprovalRequired));
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível carregar este anúncio.");
    } finally {
      setLoading(false);
    }
  }, [listingId, session, signOut]);

  useEffect(() => {
    if (!session) {
      router.replace({ pathname: "/login", params: { returnTo: listingId ? `/listing-editor?id=${listingId}` : "/listing-editor" } });
      return;
    }
    void load();
  }, [load, listingId, session]);

  const input = useMemo<OwnerListingInput>(() => ({
    type,
    title: title.trim(),
    description: description.trim(),
    city: city.trim() || undefined,
    area: area.trim() || undefined,
    propertyType,
    bedroomCount: optionalInt(bedrooms),
    bathroomCount: optionalInt(bathrooms),
    monthlyPriceCents: centsFromEuro(price),
    depositAmountCents: centsFromEuro(deposit),
    furnished,
    couplesAllowed,
    petsAllowed,
    smokingAllowed,
    childrenFamiliesAllowed: familiesAllowed,
    studentsAllowed,
    formalContract,
    landlordApprovalRequired,
    availableFrom: availableFrom.trim() || undefined,
    minimumStayDays: optionalInt(minimumStayDays),
  }), [
    area,
    availableFrom,
    bathrooms,
    bedrooms,
    city,
    couplesAllowed,
    deposit,
    description,
    familiesAllowed,
    formalContract,
    furnished,
    landlordApprovalRequired,
    minimumStayDays,
    petsAllowed,
    price,
    propertyType,
    smokingAllowed,
    studentsAllowed,
    title,
    type,
  ]);

  const save = async () => {
    if (!session) return;
    if (!input.title || !input.description) {
      setError("Informe título e descrição.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = listingId
        ? await updateListing(listingId, input, session.accessToken)
        : await createListing(input, session.accessToken);
      router.replace({ pathname: "/listing-owner/[id]", params: { id: saved.id } });
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível salvar. Confira os campos e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando anúncio...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {editing ? "Editar anúncio" : "Novo anúncio"}
        </Text>
        <Text style={styles.muted}>
          {editing
            ? "Alterações relevantes podem enviar o anúncio novamente para análise. O servidor decide isso automaticamente."
            : "O anúncio será enviado para análise antes de ficar público."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tipo</Text>
        <View style={styles.choiceRow}>
          <Choice label="Aluguel" selected={type === "RENTAL"} onPress={() => setType("RENTAL")} />
          <Choice label="Transferência" selected={type === "TRANSFER"} onPress={() => setType("TRANSFER")} />
        </View>
        <Field label="Título" value={title} onChangeText={setTitle} />
        <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
        <Field label="Cidade" value={city} onChangeText={setCity} />
        <Field label="Área / bairro" value={area} onChangeText={setArea} />

        <Text style={styles.sectionTitle}>Imóvel</Text>
        <View style={styles.choiceWrap}>
          {propertyTypes.map((option) => (
            <Choice key={option.value} label={option.label} selected={propertyType === option.value} onPress={() => setPropertyType(option.value)} />
          ))}
        </View>
        <Field label="Quartos" keyboardType="number-pad" value={bedrooms} onChangeText={setBedrooms} />
        <Field label="Banheiros" keyboardType="number-pad" value={bathrooms} onChangeText={setBathrooms} />

        <Text style={styles.sectionTitle}>Preço e disponibilidade</Text>
        <Field label="Preço mensal (€)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <Field label="Depósito (€)" keyboardType="decimal-pad" value={deposit} onChangeText={setDeposit} />
        <Field label="Disponível a partir de (AAAA-MM-DD)" value={availableFrom} onChangeText={setAvailableFrom} autoCapitalize="none" />
        <Field label="Estadia mínima (dias)" keyboardType="number-pad" value={minimumStayDays} onChangeText={setMinimumStayDays} />

        <Text style={styles.sectionTitle}>Condições</Text>
        <Toggle label="Mobiliado" value={furnished} onChange={setFurnished} />
        <Toggle label="Aceita casal" value={couplesAllowed} onChange={setCouplesAllowed} />
        <Toggle label="Aceita pets" value={petsAllowed} onChange={setPetsAllowed} />
        <Toggle label="Permite fumar" value={smokingAllowed} onChange={setSmokingAllowed} />
        <Toggle label="Aceita famílias com crianças" value={familiesAllowed} onChange={setFamiliesAllowed} />
        <Toggle label="Aceita estudantes" value={studentsAllowed} onChange={setStudentsAllowed} />
        <Toggle label="Há contrato formal" value={formalContract} onChange={setFormalContract} />
        <Toggle label="Exige aprovação do landlord" value={landlordApprovalRequired} onChange={setLandlordApprovalRequired} />

        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <AppButton disabled={saving} label={saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar anúncio"} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <AppButton label={label} onPress={onPress} variant={selected ? "primary" : "secondary"} />;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.label}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.sm },
  muted: { color: colors.textMuted, lineHeight: 21 },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontWeight: "700" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md },
  multiline: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choiceWrap: { gap: spacing.sm },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 48 },
  error: { color: colors.danger, lineHeight: 20 },
});
