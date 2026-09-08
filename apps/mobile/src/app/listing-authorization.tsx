import { useCallback, useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getLatestListingAuthorization,
  submitListingAuthorization,
  type ListingAuthorizationEvidenceField,
  type ListingAuthorizationStatus,
  type LocalEvidenceFile,
} from "@/api/owner-listings";
import { BrandHeader } from "@/components/BrandHeader";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

type EvidenceSelection = {
  field: ListingAuthorizationEvidenceField;
  label: string;
  symbol: string;
  file: LocalEvidenceFile | null;
};

const initialEvidence: EvidenceSelection[] = [
  {
    field: "tenancyAgreement",
    label: "Contrato de arrendamento",
    symbol: "▤",
    file: null,
  },
  {
    field: "landlordAuthorization",
    label: "Autorização do proprietário",
    symbol: "⌂",
    file: null,
  },
  {
    field: "proofOfOwnership",
    label: "Comprovante de propriedade",
    symbol: "✓",
    file: null,
  },
  {
    field: "agencyMandate",
    label: "Autorização da agência ou gestora",
    symbol: "▣",
    file: null,
  },
  {
    field: "otherSupportingDocument",
    label: "Outro documento de apoio",
    symbol: "+",
    file: null,
  },
];

function statusCopy(status: ListingAuthorizationStatus | null | undefined) {
  switch (status) {
    case "SUBMITTED":
      return "Documentos enviados. A análise ainda não começou.";
    case "UNDER_REVIEW":
      return "A comprovação está em análise.";
    case "CORRECTION_REQUIRED":
      return "A equipe pediu uma nova comprovação ou correção.";
    case "APPROVED":
      return "Direito de anunciar aprovado.";
    case "REJECTED":
      return "A última comprovação não foi aprovada. Você pode reenviar.";
    case "CANCELLED":
      return "A última tentativa foi cancelada. Você pode enviar novamente.";
    default:
      return "Nenhuma comprovação foi enviada para este anúncio.";
  }
}

function statusLabel(status: ListingAuthorizationStatus | null | undefined) {
  switch (status) {
    case "SUBMITTED":
      return "Enviada";
    case "UNDER_REVIEW":
      return "Em análise";
    case "CORRECTION_REQUIRED":
      return "Correção necessária";
    case "APPROVED":
      return "Aprovada";
    case "REJECTED":
      return "Não aprovada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return "Não iniciada";
  }
}

function statusTone(status: ListingAuthorizationStatus | null | undefined) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED" || status === "CORRECTION_REQUIRED") {
    return "danger" as const;
  }
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function canSubmit(status: ListingAuthorizationStatus | null | undefined) {
  return (
    !status || ["CORRECTION_REQUIRED", "REJECTED", "CANCELLED"].includes(status)
  );
}

export default function ListingAuthorizationScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { session, signOut } = useSession();
  const [evidence, setEvidence] =
    useState<EvidenceSelection[]>(initialEvidence);
  const [status, setStatus] = useState<ListingAuthorizationStatus | null>(null);
  const [reviewReason, setReviewReason] = useState<string | null>(null);
  const [submittedFiles, setSubmittedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const clearLocalEvidence = useCallback(() => {
    setEvidence(initialEvidence.map((item) => ({ ...item, file: null })));
  }, []);

  const load = useCallback(async () => {
    if (!session || !id) {
      if (!session) router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const latest = await getLatestListingAuthorization(
        id,
        session.accessToken,
      );
      setStatus(latest?.status ?? null);
      setReviewReason(latest?.reviewReason ?? null);
      setSubmittedFiles(
        latest?.evidence.map((item) => item.originalFileName ?? item.type) ??
          [],
      );
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível carregar a comprovação deste anúncio.");
    } finally {
      setLoading(false);
    }
  }, [id, session, signOut]);

  useEffect(() => {
    void load();
    return clearLocalEvidence;
  }, [clearLocalEvidence, load]);

  const pick = async (field: ListingAuthorizationEvidenceField) => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      setError("Cada arquivo deve ter no máximo 10 MB.");
      return;
    }
    setEvidence((current) =>
      current.map((item) =>
        item.field === field
          ? {
              ...item,
              file: {
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType ?? "application/octet-stream",
              },
            }
          : item,
      ),
    );
  };

  const submit = async () => {
    if (!session || !id) return;
    const selected = evidence
      .filter((item): item is EvidenceSelection & { file: LocalEvidenceFile } =>
        Boolean(item.file),
      )
      .map((item) => ({ field: item.field, file: item.file }));
    if (selected.length === 0) {
      setError(
        "Selecione pelo menos um documento que comprove seu direito de anunciar.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitted(false);
    setError(null);
    try {
      const result = await submitListingAuthorization(
        id,
        selected,
        session.accessToken,
      );
      clearLocalEvidence();
      setStatus(result.status);
      setSubmittedFiles(
        result.evidence.map((item) => item.originalFileName ?? item.type),
      );
      setSubmitted(true);
    } catch (caught) {
      const code = (caught as Error & { status?: number }).status;
      if (code === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      if (code === 409) {
        setError(
          "Já existe uma comprovação em andamento ou aprovada para este anúncio.",
        );
      } else if (code === 403) {
        setError(
          "Este anúncio ou sua conta não está elegível para enviar comprovação agora.",
        );
      } else {
        setError(
          "Não foi possível enviar os documentos. Confira os formatos e tente novamente.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ProductState
          description="Estamos carregando o estado mais recente da comprovação deste anúncio."
          kind="loading"
          title="Carregando comprovação"
        />
      </View>
    );
  }

  const submissionAllowed = canSubmit(status);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <BrandHeader compact />
        <AppBadge label={statusLabel(status)} tone={statusTone(status)} />
      </View>

      <View style={styles.heroIcon}>
        <Text style={styles.heroIconText}>▤</Text>
      </View>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Autorização do anúncio
        </Text>
        <Text style={styles.muted}>{statusCopy(status)}</Text>
      </View>

      <View style={styles.trustNote}>
        <Text style={styles.trustShield}>✓</Text>
        <Text style={styles.trustText}>
          Envie um comprovativo para confirmar que você tem autorização para
          anunciar esta moradia. Os documentos permanecem privados.
        </Text>
      </View>

      {reviewReason ? (
        <View style={styles.reviewBox}>
          <Text style={styles.reviewTitle}>Ajuste solicitado</Text>
          <Text style={styles.reviewText}>{reviewReason}</Text>
        </View>
      ) : null}

      {submittedFiles.length > 0 ? (
        <View style={styles.submittedCard}>
          <Text style={styles.sectionTitle}>Último envio</Text>
          {submittedFiles.map((name, index) => (
            <Text key={`${name}-${index}`} style={styles.submittedFile}>
              ✓ {name}
            </Text>
          ))}
        </View>
      ) : null}

      {submissionAllowed ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Escolha o comprovativo</Text>
          <Text style={styles.helper}>
            PDF, JPEG, PNG ou WebP. Até 5 arquivos e 10 MB por arquivo.
          </Text>

          {evidence.map((item) => (
            <View key={item.field} style={styles.evidenceRow}>
              <View style={styles.evidenceSymbol}>
                <Text style={styles.evidenceSymbolText}>{item.symbol}</Text>
              </View>
              <View style={styles.evidenceCopy}>
                <Text style={styles.evidenceLabel}>{item.label}</Text>
                <Text numberOfLines={1} style={styles.evidenceFile}>
                  {item.file?.name ?? "Nenhum arquivo selecionado"}
                </Text>
              </View>
              <AppButton
                label={item.file ? "Trocar" : "Selecionar"}
                onPress={() => void pick(item.field)}
                variant="secondary"
              />
            </View>
          ))}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {submitted ? (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Comprovação enviada para análise.
            </Text>
          ) : null}
          <AppButton
            disabled={submitting}
            label={submitting ? "Enviando..." : "Enviar documento"}
            onPress={() => void submit()}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nenhuma ação necessária agora</Text>
          <Text style={styles.muted}>{statusCopy(status)}</Text>
          <AppButton
            label="Atualizar estado"
            onPress={() => void load()}
            variant="secondary"
          />
        </View>
      )}
    </ScrollView>
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
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroIcon: {
    width: 70,
    height: 70,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 35,
    backgroundColor: colors.successSoft,
    marginTop: spacing.sm,
  },
  heroIconText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
  },
  heading: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
    textAlign: "center",
  },
  trustNote: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  trustShield: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  trustText: {
    flex: 1,
    color: colors.primaryPressed,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  reviewBox: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
  },
  reviewTitle: {
    color: colors.warning,
    fontFamily: fontFamily.bold,
  },
  reviewText: {
    color: colors.text,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
  },
  submittedCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  submittedFile: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  evidenceRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  evidenceSymbol: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
  },
  evidenceSymbolText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
  },
  evidenceCopy: {
    flex: 1,
    gap: 2,
  },
  evidenceLabel: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  evidenceFile: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
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
