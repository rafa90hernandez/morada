import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  createListing,
  getMyListing,
  updateListing,
} from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";
import { ListingAmenitiesFields } from "./ListingAmenitiesFields";
import { ListingCoreFields } from "./ListingCoreFields";
import { ChoiceGroup } from "./ListingFormControls";
import { ListingTransportFields } from "./ListingTransportFields";
import {
  draftFromListing,
  emptyListingDraft,
  estimatedInitialCostCents,
  inputFromDraft,
  type ListingDraft,
} from "./listing-draft";
import type { ExtendedOwnerListing } from "./owner-listing-extended";

const listingTypes = [
  { value: "RENTAL", label: "Aluguel" },
  { value: "TRANSFER", label: "Transferência" },
] as const;

export function ListingEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === "string" ? params.id : undefined;
  const editing = Boolean(listingId);
  const { session, signOut } = useSession();
  const [draft, setDraft] = useState<ListingDraft>(emptyListingDraft);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const load = useCallback(async () => {
    if (!listingId || !session) return;
    setLoading(true);
    setError(null);
    try {
      const item = await getMyListing(listingId, session.accessToken);
      setDraft(draftFromListing(item as ExtendedOwnerListing));
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
      router.replace({
        pathname: "/login",
        params: {
          returnTo: listingId
            ? `/listing-editor?id=${listingId}`
            : "/listing-editor",
        },
      });
      return;
    }
    void load();
  }, [load, listingId, session]);

  const input = useMemo(() => inputFromDraft(draft), [draft]);
  const estimatedInitialCost = useMemo(
    () => estimatedInitialCostCents(draft) / 100,
    [draft],
  );

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
      router.replace({
        pathname: "/listing-owner/[id]",
        params: { id: saved.id },
      });
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

  if (!session) return null;

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
            ? "Alterações materiais podem enviar o anúncio novamente para moderação. Essa decisão é feita pelo servidor."
            : "O anúncio será enviado para moderação antes de ficar público."}
        </Text>
        <ChoiceGroup
          clearable={false}
          label="Tipo de anúncio"
          onChange={(value) => value && set("type", value)}
          options={[...listingTypes]}
          value={draft.type}
        />
      </View>

      <View style={styles.card}>
        <ListingCoreFields draft={draft} set={set} />
      </View>

      <View style={styles.card}>
        <ListingAmenitiesFields draft={draft} set={set} />
      </View>

      <View style={styles.card}>
        <ListingTransportFields draft={draft} set={set} />
      </View>

      <View style={styles.card}>
        <Text style={styles.summaryTitle}>Resumo financeiro</Text>
        <Text style={styles.muted}>
          Custo inicial estimado com depósito + aluguel antecipado: €
          {estimatedInitialCost.toFixed(2)}
        </Text>
        <Text style={styles.note}>
          Este valor é apenas uma soma dos campos informados e não representa
          cobrança pelo Morada.
        </Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          disabled={saving}
          label={
            saving
              ? "Salvando..."
              : editing
                ? "Salvar alterações"
                : "Criar anúncio"
          }
          onPress={() => void save()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.textMuted, lineHeight: 21 },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, lineHeight: 20 },
});
