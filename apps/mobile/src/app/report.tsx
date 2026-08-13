import { useMemo, useState, type ComponentProps } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { submitReport, type ReportReason } from "@/api/safety";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const reasons: Array<{ value: ReportReason; label: string }> = [
  { value: "SCAM", label: "Possível golpe" },
  { value: "HARASSMENT", label: "Assédio" },
  { value: "SPAM", label: "Spam" },
  { value: "OFFENSIVE_LANGUAGE", label: "Linguagem ofensiva" },
  { value: "MISLEADING_LISTING", label: "Anúncio enganoso" },
  { value: "SUSPICIOUS_PAYMENT", label: "Pedido de pagamento suspeito" },
  { value: "ABUSIVE_BEHAVIOR", label: "Comportamento abusivo" },
  { value: "OTHER", label: "Outro" },
];

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    reportedUserId?: string;
    listingId?: string;
    conversationId?: string;
    context?: string;
  }>();
  const { session, signOut } = useSession();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const context = useMemo(
    () =>
      typeof params.context === "string" ? params.context : "este conteúdo",
    [params.context],
  );

  const submit = async () => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!reason) {
      setError("Escolha o motivo da denúncia.");
      return;
    }
    if (description.length > 1000) {
      setError("A descrição pode ter no máximo 1.000 caracteres.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await submitReport(
        {
          reason,
          description: description.trim() || undefined,
          reportedUserId:
            typeof params.reportedUserId === "string"
              ? params.reportedUserId
              : undefined,
          listingId:
            typeof params.listingId === "string" ? params.listingId : undefined,
          conversationId:
            typeof params.conversationId === "string"
              ? params.conversationId
              : undefined,
        },
        session.accessToken,
      );
      setSent(true);
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível enviar a denúncia agora.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          Denúncia enviada
        </Text>
        <Text style={styles.mutedCenter}>
          A denúncia é um sinal para análise, não uma prova automática de
          irregularidade. O envio não significa punição imediata.
        </Text>
        <AppButton label="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Denunciar {context}
        </Text>
        <Text style={styles.muted}>
          Escolha o motivo que melhor descreve sua preocupação. A equipe pode
          revisar o contexto disponível; uma denúncia por si só não comprova uma
          violação e não gera punição automática.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Motivo</Text>
        {reasons.map((item) => (
          <AppButton
            key={item.value}
            label={item.label}
            onPress={() => setReason(item.value)}
            variant={reason === item.value ? "primary" : "secondary"}
          />
        ))}
        <Field
          label="Descrição opcional"
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Conte o que aconteceu sem incluir informações desnecessárias."
        />
        <Text style={styles.helper}>{description.length}/1000</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          disabled={busy}
          label={busy ? "Enviando..." : "Enviar denúncia"}
          onPress={() => void submit()}
        />
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.multiline]}
        {...props}
      />
    </View>
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
  mutedCenter: { color: colors.textMuted, lineHeight: 21, textAlign: "center" },
  helper: { color: colors.textMuted, fontSize: 12, textAlign: "right" },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontWeight: "700" },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  multiline: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  error: { color: colors.danger, lineHeight: 20 },
});
