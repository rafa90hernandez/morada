import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
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
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";
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
      goToStep(0);
      setError("Informe título e descrição.");
      return;
    }
    if (!input.city) {
      goToStep(1);
      setError("Informe a cidade do anúncio.");
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
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backSymbol}>‹</Text>
        </Pressable>
        <Text style={styles.topTitle}>{editing ? "Editar anúncio" : "Criar anúncio"}</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeading}>
          <Text style={styles.eyebrow}>
            Etapa {step + 1} de {steps.length}
          </Text>
          <Text style={styles.progressPercent}>
            {Math.round(((step + 1) / steps.length) * 100)}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step + 1) / steps.length) * 100}%` },
            ]}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {steps[step].title}
        </Text>
        <Text style={styles.muted}>
          {editing
            ? "Atualize somente o que precisar. As informações continuam protegidas pelas regras de segurança do Morada."
            : "Preencha aos poucos. Você poderá revisar tudo antes de enviar o anúncio para análise."}
        </Text>
      </View>

      <View style={styles.card}>{renderStep(step, draft, set)}</View>

      {step === steps.length - 1 ? (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Revise seu anúncio</Text>
          <Text style={styles.reviewCopy}>
            Confira os dados principais antes de continuar. Depois você poderá
            adicionar as fotos e completar as etapas de confiança do anúncio.
          </Text>
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
            value={
              draft.monthlyPrice ? `€ ${draft.monthlyPrice}` : "Não informado"
            }
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
            <View style={styles.photoIcon}>
              <Text style={styles.photoIconText}>▣</Text>
            </View>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Fotos vêm logo em seguida</Text>
              <Text style={styles.muted}>
                Ao salvar, você irá para o gerenciamento do anúncio para
                adicionar e conferir as fotos antes da publicação.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        </View>
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

      <View style={styles.stepDots}>
        {steps.map((item, index) => (
          <View
            key={item.short}
            style={[
              styles.stepDot,
              index <= step && styles.stepDotActive,
              index === step && styles.stepDotCurrent,
            ]}
          />
        ))}
      </View>
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
          <View style={styles.reviewBadge}>
            <Text style={styles.reviewBadgeText}>✓</Text>
          </View>
          <Text style={styles.summaryTitle}>Tudo pronto para revisar</Text>
          <Text style={styles.muted}>
            Use Voltar para ajustar qualquer informação. Depois de salvar, o
            próximo passo é completar as fotos.
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
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  backButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  backSymbol: {
    marginTop: -3,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 32,
    lineHeight: 34,
  },
  topTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  topSpacer: {
    width: 42,
  },
  progressCard: {
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
  },
  progressHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  progressPercent: {
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
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.7,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  reviewCopy: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.semibold,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: spacing.xs,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  stepDotActive: {
    backgroundColor: colors.primarySoft,
  },
  stepDotCurrent: {
    width: 22,
    backgroundColor: colors.primary,
  },
  reviewIntro: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reviewBadge: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  reviewBadgeText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 24,
  },
  summaryRow: {
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  summaryValue: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  photoCallout: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  photoIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  photoIconText: {
    color: colors.primary,
    fontSize: 20,
  },
  photoCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  photoTitle: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
  },
});
