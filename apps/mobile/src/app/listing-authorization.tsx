import { useCallback, useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getLatestListingAuthorization,
  submitListingAuthorization,
  type ListingAuthorizationEvidenceField,
  type ListingAuthorizationStatus,
  type LocalEvidenceFile,
} from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

type EvidenceSelection = {
  field: ListingAuthorizationEvidenceField;
  label: string;
  file: LocalEvidenceFile | null;
};

const initialEvidence: EvidenceSelection[] = [
  { field: "tenancyAgreement", label: "Contrato de aluguel", file: null },
  {
    field: "landlordAuthorization",
    label: "Autorização do landlord",
    file: null,
  },
  {
    field: "proofOfOwnership",
    label: "Comprovante de propriedade",
    file: null,
  },
  { field: "agencyMandate", label: "Mandato da agência", file: null },
  {
    field: "otherSupportingDocument",
    label: "Outro documento de apoio",
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
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando comprovação...</Text>
      </View>
    );
  }

  const submissionAllowed = canSubmit(status);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Direito de anunciar
        </Text>
        <Text style={styles.muted}>{statusCopy(status)}</Text>
        {reviewReason ? (
          <Text style={styles.warning}>Revisão: {reviewReason}</Text>
        ) : null}
        <Text style={styles.helper}>
          Esses arquivos são evidências privadas. O app mostra apenas tipo, nome
          e estado da análise — nunca object keys, hashes ou URLs privadas de
          armazenamento.
        </Text>
      </View>

      {submittedFiles.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Arquivos da última tentativa</Text>
          {submittedFiles.map((name, index) => (
            <Text key={`${name}-${index}`} style={styles.muted}>
              • {name}
            </Text>
          ))}
        </View>
      ) : null}

      {submissionAllowed ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selecione os comprovantes</Text>
          <Text style={styles.helper}>
            PDF, JPEG, PNG ou WebP. Até 5 arquivos no total e 10 MB por arquivo.
          </Text>
          {evidence.map((item) => (
            <View key={item.field} style={styles.evidenceRow}>
              <View style={styles.evidenceCopy}>
                <Text style={styles.evidenceLabel}>{item.label}</Text>
                <Text style={styles.muted}>
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
            label={submitting ? "Enviando..." : "Enviar comprovação"}
            onPress={() => void submit()}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nenhum envio necessário agora</Text>
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
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.textMuted, lineHeight: 21 },
  helper: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  warning: { color: colors.warning, lineHeight: 20 },
  evidenceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  evidenceCopy: { flex: 1, gap: 2 },
  evidenceLabel: { color: colors.text, fontWeight: "700" },
  error: { color: colors.danger, lineHeight: 20 },
  success: { color: colors.success, fontWeight: "700" },
});
