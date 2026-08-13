import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { ListingSearchFilters, ListingSearchResponse } from "@/api/types";
import { AppButton } from "@/components/ui/AppButton";
import { colors, radius, spacing } from "@/theme/tokens";

type SortMode = ListingSearchResponse["sort"];

type Props = {
  show: boolean;
  values: {
    county: string;
    area: string;
    availableOn: string;
    bedrooms: string;
    bathrooms: string;
    currentResidents: string;
    peopleSharingSpace: string;
    peopleSharingBathroom: string;
    minimumStayDays: string;
    listingType?: ListingSearchFilters["listingType"];
    propertyType?: ListingSearchFilters["propertyType"];
    occupancyType?: ListingSearchFilters["propertyOccupancyType"];
    spaceType?: ListingSearchFilters["advertisedSpaceType"];
    bathroomType?: ListingSearchFilters["bathroomType"];
    billsIncluded?: ListingSearchFilters["billsIncludedType"];
    furnished: boolean;
    couples: boolean;
    pets: boolean;
    smoking: boolean;
    families: boolean;
    students: boolean;
    sort: SortMode;
  };
  setters: Record<string, (value: never) => void>;
  onApply: () => void;
};

const propertyTypes: Array<{
  value: NonNullable<ListingSearchFilters["propertyType"]>;
  label: string;
}> = [
  { value: "SINGLE_ROOM", label: "Quarto individual" },
  { value: "SHARED_ROOM", label: "Quarto compartilhado" },
  { value: "STUDIO", label: "Studio" },
  { value: "APARTMENT", label: "Apartamento" },
  { value: "HOUSE", label: "Casa" },
  { value: "BED_SPACE", label: "Bed space" },
  { value: "OTHER", label: "Outro" },
];

const sortModes: Array<{ value: SortMode; label: string }> = [
  { value: "RELEVANCE", label: "Recomendados" },
  { value: "PRICE_ASC", label: "Menor preço" },
  { value: "PRICE_DESC", label: "Maior preço" },
  { value: "NEWEST", label: "Mais novos" },
];

export function DiscoveryFilters({ show, values, setters, onApply }: Props) {
  if (!show) return null;

  return (
    <ScrollView style={styles.advancedScroll}>
      <View style={styles.advancedFilters}>
        <Text style={styles.filterTitle}>Localização e disponibilidade</Text>
        <TextField
          label="Condado"
          value={values.county}
          onChangeText={setters.county}
        />
        <TextField
          label="Área ou bairro"
          value={values.area}
          onChangeText={setters.area}
        />
        <TextField
          label="Disponível em AAAA-MM-DD"
          value={values.availableOn}
          onChangeText={setters.availableOn}
        />
        <ChoiceRow
          label="Tipo de anúncio"
          options={[
            { value: "RENTAL", label: "Aluguel" },
            { value: "TRANSFER", label: "Transferência" },
          ]}
          selected={values.listingType}
          setSelected={setters.listingType}
        />
        <ChoiceRow
          label="Tipo de imóvel"
          options={propertyTypes}
          selected={values.propertyType}
          setSelected={setters.propertyType}
        />
        <ChoiceRow
          label="Imóvel"
          options={[
            { value: "ENTIRE_PROPERTY", label: "Inteiro" },
            { value: "SHARED_PROPERTY", label: "Compartilhado" },
          ]}
          selected={values.occupancyType}
          setSelected={setters.occupancyType}
        />
        <ChoiceRow
          label="Espaço anunciado"
          options={[
            { value: "PRIVATE", label: "Privado" },
            { value: "SHARED", label: "Compartilhado" },
          ]}
          selected={values.spaceType}
          setSelected={setters.spaceType}
        />
        <ChoiceRow
          label="Banheiro"
          options={[
            { value: "PRIVATE", label: "Privado" },
            { value: "SHARED", label: "Compartilhado" },
          ]}
          selected={values.bathroomType}
          setSelected={setters.bathroomType}
        />
        <ChoiceRow
          label="Contas incluídas"
          options={[
            { value: "YES", label: "Sim" },
            { value: "NO", label: "Não" },
            { value: "PARTIAL", label: "Parcial" },
          ]}
          selected={values.billsIncluded}
          setSelected={setters.billsIncluded}
        />

        <Text style={styles.filterTitle}>Configuração da casa</Text>
        <NumericField
          label="Mínimo de quartos"
          value={values.bedrooms}
          onChangeText={setters.bedrooms}
        />
        <NumericField
          label="Mínimo de banheiros"
          value={values.bathrooms}
          onChangeText={setters.bathrooms}
        />
        <NumericField
          label="Moradores atuais"
          value={values.currentResidents}
          onChangeText={setters.currentResidents}
        />
        <NumericField
          label="Pessoas compartilhando o quarto ou espaço"
          value={values.peopleSharingSpace}
          onChangeText={setters.peopleSharingSpace}
        />
        <NumericField
          label="Pessoas compartilhando o banheiro"
          value={values.peopleSharingBathroom}
          onChangeText={setters.peopleSharingBathroom}
        />
        <NumericField
          label="Estadia mínima máxima em dias"
          value={values.minimumStayDays}
          onChangeText={setters.minimumStayDays}
        />

        <Text style={styles.filterTitle}>Preferências objetivas</Text>
        <View style={styles.chipWrap}>
          {[
            ["Mobilado", "furnished"],
            ["Casais", "couples"],
            ["Pets", "pets"],
            ["Fumar", "smoking"],
            ["Famílias", "families"],
            ["Estudantes", "students"],
          ].map(([label, key]) => (
            <ToggleChip
              key={key}
              label={label}
              selected={Boolean(values[key as keyof typeof values])}
              setSelected={setters[key]}
            />
          ))}
        </View>
        <ChoiceRow
          label="Ordenar"
          options={sortModes}
          selected={values.sort}
          setSelected={setters.sort}
          allowClear={false}
        />
        <AppButton label="Aplicar filtros" onPress={onApply} />
      </View>
    </ScrollView>
  );
}

function TextField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor={colors.textMuted}
      style={styles.input}
      value={value}
    />
  );
}

function NumericField(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return <TextField {...props} />;
}

function ToggleChip({
  label,
  selected,
  setSelected,
}: {
  label: string;
  selected: boolean;
  setSelected: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => setSelected(!selected)}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceRow<T extends string>({
  label,
  options,
  selected,
  setSelected,
  allowClear = true,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T | undefined;
  setSelected: (value: T | undefined) => void;
  allowClear?: boolean;
}) {
  return (
    <View style={styles.choiceSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === option.value }}
            key={option.value}
            onPress={() =>
              setSelected(
                allowClear && selected === option.value
                  ? undefined
                  : option.value,
              )
            }
            style={[
              styles.chip,
              selected === option.value && styles.chipSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selected === option.value && styles.chipTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  advancedScroll: {
    maxHeight: 310,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  advancedFilters: { gap: spacing.md, padding: spacing.md },
  filterTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  filterLabel: { color: colors.text, fontWeight: "700" },
  choiceSection: { gap: spacing.sm },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { color: colors.text, fontWeight: "700" },
  chipTextSelected: { color: colors.primary },
});
