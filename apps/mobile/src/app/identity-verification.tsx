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
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProductState } from "@/components/ui/ProductState";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const documentTypes: Array<{ value: IdentityDocumentType; label: string }> = [
  { value: "PASSPORT", label: "Passaporte" },
  { value: "EU_EEA_NATIONAL_ID", label: "Documento nacional UE/EEE" },
  { value: "DRIVING_LICENCE", label: "Carta de condução" },
  { value: "IRP", label: "IRP" },
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
      <AppCard tone="muted">
        <Text style={styles.eyebrow}>SEGURANÇA MORADA</Text>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            Verificação de identidade
          </Text>
          <AppBadge
            label={statusLabel(currentStatus)}
            tone={statusTone(currentStatus)}
          />
        </View>
        <Text style={styles.muted}>{statusCopy(currentStatus)}</Text>
        <Text style={styles.helper}>
          Suas evidências são privadas e usadas apenas para verificação. O app
          não expõe endereços de armazenamento, hashes nem links permanentes
          desses arquivos.
        </Text>
      </AppCard>

      {!user.eligibility.isEligible ? (
        <AppCard tone="warm">
          <Text style={styles.warningTitle}>Elegibilidade 18+ necessária</Text>
          <Text style={styles.muted}>
            Atualize sua data de nascimento em Perfil antes de continuar.
          </Text>
          <AppButton
            label="Abrir Perfil"
            onPress={() => router.push("/account")}
            variant="secondary"
          />
        </AppCard>
      ) : null}

      {submissionAllowed ? (
        <AppCard>
          <Text style={styles.sectionTitle}>1. Escolha o documento</Text>
          <View style={styles.options}>
            {documentTypes.map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: documentType === option.value }}
                key={option.value}
                onPress={() => setDocumentType(option.value)}
                style={[
                  styles.option,
                  documentType === option.value && styles.optionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    documentType === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>2. Selecione as evidências</Text>
          <EvidenceRow
            label="Frente do documento · obrigatória"
            selected={Boolean(front)}
            onPress={() => void pick("front")}
          />
          <EvidenceRow
            label="Verso do documento · opcional"
            selected={Boolean(back)}
            onPress={() => void pick("back")}
          />
          <EvidenceRow
            label="Selfie segurando o documento · obrigatória"
            selected={Boolean(selfie)}
            onPress={() => void pick("selfie")}
          />

          <Text style={styles.helper}>
            As imagens selecionadas ficam apenas em memória nesta tela e são
            removidas do estado após o envio ou ao sair.
          </Text>
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
        </AppCard>
      ) : null}

      {!submissionAllowed && user.eligibility.isEligible ? (
        <AppCard>
          <Text style={styles.sectionTitle}>Nenhuma ação necessária agora</Text>
          <Text style={styles.muted}>{statusCopy(currentStatus)}</Text>
          <AppButton
            label="Atualizar estado"
            onPress={() => void load()}
            variant="secondary"
          />
        </AppCard>
      ) : null}
    </ScrollView>
  );
}

function EvidenceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.evidenceRow}>
      <View style={styles.evidenceText}>
        <Text style={styles.evidenceLabel}>{label}</Text>
        <Text style={styles.muted}>
          {selected ? "Imagem selecionada" : "Nenhuma imagem selecionada"}
        </Text>
      </View>
      <AppButton
        label={selected ? "Trocar" : "Selecionar"}
        onPress={onPress}
        variant="secondary"
      />
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
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  warningTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontWeight: "700",
  },
  optionTextSelected: {
    color: colors.surface,
    fontWeight: "800",
  },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  evidenceText: {
    flex: 1,
    gap: 2,
  },
  evidenceLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
  success: {
    color: colors.success,
    fontWeight: "700",
  },
});
