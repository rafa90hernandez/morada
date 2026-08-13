import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getMapMarkers, searchListings } from "@/api/client";
import type {
  ListingCard as ListingCardType,
  ListingSearchFilters,
  ListingSearchResponse,
  MapMarker,
} from "@/api/types";
import { ApproximateMap } from "@/components/ApproximateMap";
import { ListingCard } from "@/components/ListingCard";
import { AppButton } from "@/components/ui/AppButton";
import { boundsFromCards } from "@/features/discovery/discovery-utils";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

type ViewMode = "list" | "map";
type SortMode = ListingSearchResponse["sort"];

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

function positiveInteger(value: string) {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return parsed > 0 ? parsed : undefined;
}

export default function DiscoveryScreen() {
  const { session } = useSession();
  const [listings, setListings] = useState<ListingCardType[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [mode, setMode] = useState<ViewMode>("list");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [city, setCity] = useState("Dublin");
  const [county, setCounty] = useState("");
  const [area, setArea] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOn, setAvailableOn] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [minimumStayDays, setMinimumStayDays] = useState("");
  const [listingType, setListingType] =
    useState<ListingSearchFilters["listingType"]>();
  const [propertyType, setPropertyType] =
    useState<ListingSearchFilters["propertyType"]>();
  const [occupancyType, setOccupancyType] =
    useState<ListingSearchFilters["propertyOccupancyType"]>();
  const [spaceType, setSpaceType] =
    useState<ListingSearchFilters["advertisedSpaceType"]>();
  const [bathroomType, setBathroomType] =
    useState<ListingSearchFilters["bathroomType"]>();
  const [billsIncluded, setBillsIncluded] =
    useState<ListingSearchFilters["billsIncludedType"]>();
  const [furnished, setFurnished] = useState(false);
  const [couples, setCouples] = useState(false);
  const [pets, setPets] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [families, setFamilies] = useState(false);
  const [students, setStudents] = useState(false);
  const [sort, setSort] = useState<SortMode>("RELEVANCE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo<ListingSearchFilters>(() => {
    const parsedPrice = positiveInteger(maxPrice);
    return {
      city: city.trim() || undefined,
      county: county.trim() || undefined,
      area: area.trim() || undefined,
      listingType,
      propertyType,
      propertyOccupancyType: occupancyType,
      advertisedSpaceType: spaceType,
      bathroomType,
      billsIncludedType: billsIncluded,
      maxPriceCents: parsedPrice ? parsedPrice * 100 : undefined,
      availableOn: availableOn.trim() || undefined,
      bedroomCountMin: positiveInteger(bedrooms),
      bathroomCountMin: positiveInteger(bathrooms),
      maxMinimumStayDays: positiveInteger(minimumStayDays),
      furnished: furnished ? true : undefined,
      couplesAllowed: couples ? true : undefined,
      petsAllowed: pets ? true : undefined,
      smokingAllowed: smoking ? true : undefined,
      childrenFamiliesAllowed: families ? true : undefined,
      studentsAllowed: students ? true : undefined,
      sort,
    };
  }, [
    area,
    availableOn,
    bathroomType,
    bathrooms,
    bedrooms,
    billsIncluded,
    city,
    county,
    couples,
    families,
    furnished,
    listingType,
    maxPrice,
    minimumStayDays,
    occupancyType,
    pets,
    propertyType,
    smoking,
    sort,
    spaceType,
    students,
  ]);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await searchListings(filters);
        setListings(result.items);

        const bounds = boundsFromCards(result.items);
        const mapResult = await getMapMarkers(bounds);
        setMarkers(mapResult.markers);
      } catch {
        setError(
          "Não foi possível carregar as moradias agora. Confira os filtros e tente novamente.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openListing = (listingId: string) => {
    router.push({ pathname: "/listing/[id]", params: { id: listingId } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>MORADA</Text>
          <View style={styles.headerActions}>
            {session ? (
              <Pressable
                accessibilityLabel="Abrir favoritos"
                accessibilityRole="button"
                onPress={() => router.push("/favorites")}
                style={styles.accountButton}
              >
                <Text style={styles.accountButtonText}>Favoritos</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={
                session ? "Abrir minha conta" : "Entrar ou criar conta"
              }
              accessibilityRole="button"
              onPress={() => router.push(session ? "/account" : "/login")}
              style={styles.accountButton}
            >
              <Text style={styles.accountButtonText}>
                {session ? "Conta" : "Entrar"}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Encontre sua próxima moradia
        </Text>
      </View>

      <View style={styles.filters}>
        <View style={styles.inlineInputs}>
          <TextInput
            accessibilityLabel="Cidade"
            autoCapitalize="words"
            onChangeText={setCity}
            placeholder="Cidade"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.flexInput]}
            value={city}
          />
          <TextInput
            accessibilityLabel="Preço máximo mensal em euros"
            inputMode="numeric"
            onChangeText={setMaxPrice}
            placeholder="Máx. €/mês"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.flexInput]}
            value={maxPrice}
          />
        </View>

        <View style={styles.filterActions}>
          <AppButton label="Buscar" onPress={() => void load()} />
          <AppButton
            label={showAdvanced ? "Menos filtros" : "Mais filtros"}
            onPress={() => setShowAdvanced((value) => !value)}
            variant="secondary"
          />
        </View>

        {showAdvanced ? (
          <ScrollView style={styles.advancedScroll}>
            <View style={styles.advancedFilters}>
              <Text style={styles.filterTitle}>
                Localização e disponibilidade
              </Text>
              <TextInput
                accessibilityLabel="Condado"
                onChangeText={setCounty}
                placeholder="Condado"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={county}
              />
              <TextInput
                accessibilityLabel="Área ou bairro"
                onChangeText={setArea}
                placeholder="Área ou bairro"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={area}
              />
              <TextInput
                accessibilityLabel="Disponível em"
                autoCapitalize="none"
                onChangeText={setAvailableOn}
                placeholder="Disponível em AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={availableOn}
              />

              <ChoiceRow
                label="Tipo de anúncio"
                options={[
                  { value: "RENTAL", label: "Aluguel" },
                  { value: "TRANSFER", label: "Transferência" },
                ]}
                selected={listingType}
                setSelected={setListingType}
              />
              <ChoiceRow
                label="Tipo de imóvel"
                options={propertyTypes}
                selected={propertyType}
                setSelected={setPropertyType}
              />
              <ChoiceRow
                label="Imóvel"
                options={[
                  { value: "ENTIRE_PROPERTY", label: "Inteiro" },
                  { value: "SHARED_PROPERTY", label: "Compartilhado" },
                ]}
                selected={occupancyType}
                setSelected={setOccupancyType}
              />
              <ChoiceRow
                label="Espaço anunciado"
                options={[
                  { value: "PRIVATE", label: "Privado" },
                  { value: "SHARED", label: "Compartilhado" },
                ]}
                selected={spaceType}
                setSelected={setSpaceType}
              />
              <ChoiceRow
                label="Banheiro"
                options={[
                  { value: "PRIVATE", label: "Privado" },
                  { value: "SHARED", label: "Compartilhado" },
                ]}
                selected={bathroomType}
                setSelected={setBathroomType}
              />
              <ChoiceRow
                label="Contas incluídas"
                options={[
                  { value: "YES", label: "Sim" },
                  { value: "NO", label: "Não" },
                  { value: "PARTIAL", label: "Parcial" },
                ]}
                selected={billsIncluded}
                setSelected={setBillsIncluded}
              />

              <View style={styles.inlineInputs}>
                <TextInput
                  accessibilityLabel="Mínimo de quartos"
                  inputMode="numeric"
                  onChangeText={setBedrooms}
                  placeholder="Quartos mín."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.flexInput]}
                  value={bedrooms}
                />
                <TextInput
                  accessibilityLabel="Mínimo de banheiros"
                  inputMode="numeric"
                  onChangeText={setBathrooms}
                  placeholder="Banheiros mín."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.flexInput]}
                  value={bathrooms}
                />
              </View>
              <TextInput
                accessibilityLabel="Estadia mínima máxima em dias"
                inputMode="numeric"
                onChangeText={setMinimumStayDays}
                placeholder="Aceitar estadia mínima de até X dias"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={minimumStayDays}
              />

              <Text style={styles.filterTitle}>Preferências objetivas</Text>
              <View style={styles.chipWrap}>
                <ToggleChip
                  label="Mobilado"
                  selected={furnished}
                  setSelected={setFurnished}
                />
                <ToggleChip
                  label="Casais"
                  selected={couples}
                  setSelected={setCouples}
                />
                <ToggleChip
                  label="Pets"
                  selected={pets}
                  setSelected={setPets}
                />
                <ToggleChip
                  label="Fumar"
                  selected={smoking}
                  setSelected={setSmoking}
                />
                <ToggleChip
                  label="Famílias"
                  selected={families}
                  setSelected={setFamilies}
                />
                <ToggleChip
                  label="Estudantes"
                  selected={students}
                  setSelected={setStudents}
                />
              </View>

              <ChoiceRow
                label="Ordenar"
                options={sortModes}
                selected={sort}
                setSelected={setSort}
                allowClear={false}
              />
              <AppButton label="Aplicar filtros" onPress={() => void load()} />
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.modeSwitch}>
        {(["list", "map"] as const).map((value) => (
          <Pressable
            accessibilityRole="button"
            key={value}
            onPress={() => setMode(value)}
            style={[
              styles.modeButton,
              mode === value && styles.modeButtonActive,
            ]}
          >
            <Text
              style={[styles.modeText, mode === value && styles.modeTextActive]}
            >
              {value === "list" ? "Lista" : "Mapa"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Buscando moradias...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Algo deu errado</Text>
          <Text style={styles.stateText}>{error}</Text>
          <AppButton label="Tentar novamente" onPress={() => void load()} />
        </View>
      ) : mode === "map" ? (
        <View style={styles.mapContainer}>
          <ApproximateMap markers={markers} onMarkerPress={openListing} />
          <Text style={styles.mapFootnote}>
            Os pontos mostram áreas aproximadas. O mapa esquemático da Beta não
            revela endereço exato e não usa um provedor externo de mapas.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={listings}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>Nenhuma moradia encontrada</Text>
              <Text style={styles.stateText}>
                Tente remover alguns filtros ou ampliar a localização.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => openListing(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  brand: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  accountButton: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  accountButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  filters: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  advancedScroll: {
    maxHeight: 310,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  advancedFilters: {
    gap: spacing.md,
    padding: spacing.md,
  },
  filterTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  filterLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  choiceSection: {
    gap: spacing.sm,
  },
  inlineInputs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
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
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
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
  chipText: {
    color: colors.text,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: colors.primary,
  },
  modeSwitch: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeText: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  modeTextActive: {
    color: colors.text,
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  mapContainer: {
    flex: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  mapFootnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateText: {
    maxWidth: 320,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
});
