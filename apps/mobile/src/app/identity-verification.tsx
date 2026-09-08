import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getMyProfile,
  submitIdentityVerification,
  type IdentityDocumentType,
  type IdentityEvidenceFile,
  type IdentityVerificationStatus,
  type PrivateUser,
} from "@/api/account";
import { BrandHeader } from "@/components/BrandHeader";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

const documentTypes: Array<{
  value: IdentityDocumentType;
  label: string;
  detail?: string;
  symbol: string;
}> = [
  { value: "PASSPORT", label: "Passaporte", symbol: "◎" },
  {
    value: "EU_EEA_NATIONAL_ID",
    label: "Cartão UE/EEE",
    detail: "Documento nacional",
    symbol: "▣",
  },
  { value: "IRP", label: "IRP", detail: "Irish Residence Permit", symbol: "▤" },
  {
    value: "DRIVING_LICENCE",
    label: "Carta de condução",
    detail: "Irish Driving Licence",
    symbol: "▰",
  },
];

function statusCopy(status: IdentityVerificationStatus | null | undefined) {
  switch (status) {
    case "SUBMITTED":
      return "Documentos enviados. A análise ainda não começou.";
    case "UNDER_REVIEW":
      return "Sua verificação está em análise.";
    case "CORRECTION_REQUIRED":
      return "É necessário enviar novas evidências para continuar.";
    case "APPROVED":
      return "Identidade verificada.";
    case "REJECTED":
      return "A última verificação não foi aprovada. Você pode enviar novas evidências.";
    case "CANCELLED":
      return "A última verificação foi cancelada. Você pode iniciar uma nova.";
    default:
      return "Você ainda não enviou evidências de identidade.";
  }
}

function statusTone(status: IdentityVerificationStatus | null | undefined) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED" || status === "CORRECTION_REQUIRED") {
    return "danger" as const;
  }
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function statusLabel(status: IdentityVerificationStatus | null | undefined) {
  switch (status) {
    case "SUBMITTED":
      return "Enviada";
    case "UNDER_REVIEW":
      return "Em análise";
    case "CORRECTION_REQUIRED":
      return "Correção necessária";
    case "APPROVED":
      return "Verificada";
    case "REJECTED":
      return "Não aprovada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return "Não iniciada";
  }
}

function canSubmit(status: IdentityVerificationStatus | null | undefined) {
  return (
    !status || ["CORRECTION_REQUIRED", "REJECTED", "CANCELLED"].includes(status)
  );
}

function evidenceFromAsset(
  asset: ImagePicker.ImagePickerAsset,
): IdentityEvidenceFile {
  const extension = asset.mimeType?.split("/")[1] ?? "jpg";
  return {
    uri: asset.uri,
    name: asset.fileName ?? `morada-identity.${extension}`,
    type: asset.mimeType ?? "image/jpeg",
  };
}

export default function IdentityVerificationScreen() {
  const { session, signOut } = useSession();
  const [user, setUser] = useState<PrivateUser | null>(null);
  const [documentType, setDocumentType] =
    useState<IdentityDocumentType>("PASSPORT");
  const [front, setFront] = useState<IdentityEvidenceFile | null>(null);
  const [back, setBack] = useState<IdentityEvidenceFile | null>(null);
  const [selfie, setSelfie] = useState<IdentityEvidenceFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const clearEvidence = useCallback(() => {
    setFront(null);
    setBack(null);
    setSelfie(null);
  }, []);

  const load = useCallback(async () => {
    if (!session) {
      router.replace({
        pathname: "/login",
        params: { returnTo: "/identity-verification" },
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setUser(await getMyProfile(session.accessToken));
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível carregar o estado da verificação.");
    } finally {
      setLoading(false);
    }
  }, [session, signOut]);

  useEffect(() => {
    void load();
    return clearEvidence;
  }, [clearEvidence, load]);

  const pick = async (target: "front" | "back" | "selfie") => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
      exif: false,
      base64: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = evidenceFromAsset(result.assets[0]);
    if (target === "front") setFront(file);
    else if (target === "back") setBack(file);
    else setSelfie(file);
  };

  const submit = async () => {
    if (!session || !user) return;
    if (!user.eligibility.isEligible) {
      setError(
        "Confirme sua data de nascimento e a elegibilidade 18+ antes de enviar documentos.",
      );
      return;
    }
    if (!front || !selfie) {
      setError(
        "Selecione a frente do documento e a selfie segurando o documento.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitted(false);
    setError(null);
    try {
      await submitIdentityVerification(session.accessToken, {
        documentType,
        documentFront: front,
        documentBack: back ?? undefined,
        selfieWithDocument: selfie,
      });
      clearEvidence();
      setSubmitted(true);
      setUser(await getMyProfile(session.accessToken));
    } catch (caught) {
      const status = (caught as Error & { status?: number }).status;
      if (status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      if (status === 409) {
        setError("Já existe uma verificação em andamento ou aprovada.");
      } else if (status === 403) {
        setError(
          "Sua conta ainda não está elegível para enviar a verificação.",
        );
      } else {
        setError(
          "Não foi possível enviar as evidências. Confira as imagens e tente novamente.",
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
          description="Estamos verificando o estado mais recente da sua conta."
          kind="loading"
          title="Carregando verificação"
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <ProductState
          actionLabel="Tentar novamente"
          description={error ?? "Tente novamente."}
          kind="error"
          onAction={() => void load()}
          title="Verificação indisponível"
        />
      </View>
    );
  }

  const currentStatus = user.verification?.documentStatus;
  const submissionAllowed =
    user.eligibility.isEligible && canSubmit(currentStatus);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <BrandHeader compact />
        <AppBadge
          label={statusLabel(currentStatus)}
          tone={statusTone(currentStatus)}
        />
      </View>

      <View style={styles.progressHeader}>
        <Text accessibilityRole="header" style={styles.title}>
          Verificação de identidade
        </Text>
        <Text style={styles.step}>1 de 3</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>
      <Text style={styles.muted}>
        Para mais segurança na comunidade, precisamos confirmar sua identidade.
      </Text>

      {!user.eligibility.isEligible ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Elegibilidade 18+ necessária</Text>
          <Text style={styles.muted}>
            Atualize sua data de nascimento em Perfil antes de continuar.
          </Text>
          <AppButton
            label="Abrir Perfil"
            onPress={() => router.push("/account")}
            variant="secondary"
          />
        </View>
      ) : null}

      {submissionAllowed ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Selecione o documento que você vai enviar
          </Text>
          <View style={styles.documentList}>
            {documentTypes.map((option) => {
              const selected = documentType === option.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option.value}
                  onPress={() => setDocumentType(option.value)}
                  style={[
                    styles.documentRow,
                    selected && styles.documentRowSelected,
                  ]}
                >
                  <View style={styles.documentIcon}>
                    <Text style={styles.documentIconText}>{option.symbol}</Text>
                  </View>
                  <View style={styles.documentCopy}>
                    <Text style={styles.documentLabel}>{option.label}</Text>
                    {option.detail ? (
                      <Text style={styles.documentDetail}>{option.detail}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>{selected ? "✓" : "›"}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Envie as imagens</Text>
          <EvidenceRow
            label="Frente do documento"
            detail="Obrigatória"
            selected={Boolean(front)}
            onPress={() => void pick("front")}
          />
          <EvidenceRow
            label="Verso do documento"
            detail="Opcional"
            selected={Boolean(back)}
            onPress={() => void pick("back")}
          />
          <EvidenceRow
            label="Selfie com o documento"
            detail="Obrigatória · mantenha o documento ao lado do rosto"
            selected={Boolean(selfie)}
            onPress={() => void pick("selfie")}
          />

          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>✓</Text>
            <Text style={styles.privacyText}>
              Seus dados são privados e usados apenas para verificação de
              identidade.
            </Text>
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {submitted ? (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Evidências enviadas para análise.
            </Text>
          ) : null}
          <AppButton
            disabled={submitting}
            label={submitting ? "Enviando..." : "Enviar para verificação"}
            onPress={() => void submit()}
          />
        </View>
      ) : null}

      {!submissionAllowed && user.eligibility.isEligible ? (
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Estado da verificação</Text>
          <Text style={styles.muted}>{statusCopy(currentStatus)}</Text>
          <AppButton
            label="Atualizar estado"
            onPress={() => void load()}
            variant="secondary"
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function EvidenceRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.evidenceRow, selected && styles.evidenceRowSelected]}
    >
      <View style={styles.evidenceIcon}>
        <Text style={styles.evidenceIconText}>{selected ? "✓" : "+"}</Text>
      </View>
      <View style={styles.evidenceText}>
        <Text style={styles.evidenceLabel}>{label}</Text>
        <Text style={styles.evidenceDetail}>
          {selected ? "Imagem selecionada" : detail}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
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
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  step: {
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
    width: "34%",
    height: "100%",
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  documentList: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  documentRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  documentRowSelected: {
    backgroundColor: colors.primarySoft,
  },
  documentIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.background,
  },
  documentIconText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
  },
  documentCopy: {
    flex: 1,
    gap: 1,
  },
  documentLabel: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  documentDetail: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  chevron: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
  },
  evidenceRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  evidenceRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  evidenceIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.successSoft,
  },
  evidenceIconText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  evidenceText: {
    flex: 1,
    gap: 2,
  },
  evidenceLabel: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  evidenceDetail: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  privacyNote: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  privacyIcon: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
  },
  privacyText: {
    flex: 1,
    color: colors.primaryPressed,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  warningCard: {
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
  },
  warningTitle: {
    color: colors.warning,
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  statusCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
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
