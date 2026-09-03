import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { ListingBasicFields } from "./ListingBasicFields";
import { ChoiceGroup } from "./ListingFormControls";
import { ListingHouseholdFields } from "./ListingHouseholdFields";
import { ListingPriceFields } from "./ListingPriceFields";
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

const steps = [
  { title: "O que você está anunciando?", short: "Anúncio" },
  { title: "Onde fica?", short: "Localização" },
  { title: "Preço e disponibilidade", short: "Preço" },
  { title: "Quarto e moradores", short: "Moradia" },
  { title: "Comodidades e transporte", short: "Comodidades" },
  { title: "Regras e requisitos", short: "Regras" },
  { title: "Revise antes de continuar", short: "Revisão" },
] as const;

export function ListingEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === "string" ? params.id : undefined;
  const editing = Boolean(listingId);
  const { session, signOut } = useSession();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState<ListingDraft>(emptyListingDraft);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
      setError(null);
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

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    setError(null);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0 }));
  };

  const next = () => {
    if (step === 0 && (!input.title || !input.description)) {
      setError("Informe título e descrição para continuar.");
      return;
    }
    if (step === 1 && !input.city) {
      setError("Informe a cidade para continuar.");
      return;
    }
    goToStep(Math.min(step + 1, steps.length - 1));
  };

  const save = async () => {
    if (!session) return;
    if (!input.title || !input.description) {
      setError("Informe título e descrição.");
      goToStep(0);
      return;
    }
    if (!input.city) {
      setError("Informe a cidade do anúncio.");
      goToStep(1);
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
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      <View style={styles.progressCard}>
        <Text style={styles.eyebrow}>
          Etapa {step + 1} de {steps.length}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {steps[step].title}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step + 1) / steps.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.muted}>
          {editing
            ? "Você pode avançar e voltar sem salvar a cada etapa."
            : "Preencha aos poucos. Você poderá revisar tudo antes de criar o anúncio."}
        </Text>
      </View>

      <View style={styles.card}>{renderStep(step, draft, set)}</View>

      {step === steps.length - 1 ? (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Resumo</Text>
          <SummaryRow label="Título" value={draft.title || "Não informado"} />
          <SummaryRow
            label="Localização"
            value={
              [draft.area, draft.city].filter(Boolean).join(" · ") ||
              "Não informada"
            }
          />
          <SummaryRow
            label="Aluguel mensal"
            value={draft.monthlyPrice ? `€ ${draft.monthlyPrice}` : "Não informado"}
          />
          <SummaryRow
            label="Disponível a partir de"
            value={draft.availableFrom || "Não informado"}
          />
          <SummaryRow
            label="Custo inicial estimado"
            value={`€ ${estimatedInitialCost.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          />
          <Text style={styles.note}>
            O custo inicial é apenas uma soma dos valores informados. O Morada
            não faz essa cobrança.
          </Text>
          <View style={styles.photoCallout}>
            <Text style={styles.photoTitle}>Fotos vêm logo em seguida</Text>
            <Text style={styles.muted}>
              Ao salvar, você irá para o gerenciamento do anúncio para adicionar,
              conferir e escolher visualmente as fotos antes da publicação.
            </Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? (
          <View style={styles.actionButton}>
            <AppButton
              disabled={saving}
              label="Voltar"
              onPress={() => goToStep(step - 1)}
              variant="secondary"
            />
          </View>
        ) : null}
        <View style={styles.actionButton}>
          {step < steps.length - 1 ? (
            <AppButton label="Continuar" onPress={next} />
          ) : (
            <AppButton
              disabled={saving}
              label={
                saving
                  ? "Salvando..."
                  : editing
                    ? "Salvar alterações"
                    : "Criar e adicionar fotos"
              }
              onPress={() => void save()}
            />
          )}
        </View>
      </View>

      <Text style={styles.stepHint}>
        {steps.map((item, index) => (index === step ? `● ${item.short}` : item.short)).join("  ·  ")}
      </Text>
    </ScrollView>
  );
}

function renderStep(
  step: number,
  draft: ListingDraft,
  set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void,
) {
  switch (step) {
    case 0:
      return (
        <>
          <ChoiceGroup
            clearable={false}
            label="Tipo de anúncio"
            onChange={(value) => value && set("type", value)}
            options={[...listingTypes]}
            value={draft.type}
          />
          <ListingBasicFields draft={draft} section="intro" set={set} />
        </>
      );
    case 1:
      return <ListingBasicFields draft={draft} section="location" set={set} />;
    case 2:
      return <ListingPriceFields draft={draft} set={set} />;
    case 3:
      return (
        <>
          <ListingBasicFields draft={draft} section="space" set={set} />
          <ListingHouseholdFields draft={draft} section="household" set={set} />
        </>
      );
    case 4:
      return (
        <>
          <ListingAmenitiesFields draft={draft} section="amenities" set={set} />
          <ListingTransportFields draft={draft} set={set} />
        </>
      );
    case 5:
      return (
        <>
          <ListingHouseholdFields draft={draft} section="rules" set={set} />
          <ListingAmenitiesFields
            draft={draft}
            section="requirements"
            set={set}
          />
        </>
      );
    default:
      return (
        <View style={styles.reviewIntro}>
          <Text style={styles.summaryTitle}>Tudo pronto para revisar</Text>
          <Text style={styles.muted}>
            Confira os principais dados abaixo. Se precisar ajustar algo, use
            Voltar. Depois de salvar, o próximo passo é completar as fotos.
          </Text>
        </View>
      );
  }
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  progressCard: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 27, fontWeight: "900" },
  summaryTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  muted: { color: colors.textMuted, lineHeight: 21 },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, lineHeight: 20 },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: { flex: 1 },
  stepHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
  },
  reviewIntro: { gap: spacing.sm },
  summaryRow: {
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
  photoCallout: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  photoTitle: { color: colors.primary, fontWeight: "800" },
});
