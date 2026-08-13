import { useState, type ComponentProps } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { closeListing, type ListingCloseReason } from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const reasons: Array<{ value: ListingCloseReason; label: string }> = [
  { value: "RENTED_VIA_MORADA", label: "Aluguei pelo Morada" },
  { value: "CLOSED_OUTSIDE_MORADA", label: "Fechei fora do Morada" },
  { value: "STOPPED_ADVERTISING", label: "Decidi parar de anunciar" },
  {
    value: "PROPERTY_UNAVAILABLE",
    label: "A moradia não está mais disponível",
  },
  { value: "LISTING_MISTAKE", label: "Criei o anúncio por engano" },
  { value: "OTHER", label: "Outro motivo" },
];

export default function ListingCloseScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { session, signOut } = useSession();
  const [reason, setReason] = useState<ListingCloseReason | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!session || !id) {
      router.replace("/login");
      return;
    }
    if (!reason) {
      setError("Escolha o motivo do encerramento.");
      return;
    }
    if (reason === "OTHER" && !detail.trim()) {
      setError("Explique brevemente o outro motivo.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await closeListing(
        id,
        { reason, detail: detail.trim() || undefined },
        session.accessToken,
      );
      router.replace({ pathname: "/listing-owner/[id]", params: { id } });
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível encerrar o anúncio no estado atual.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Encerrar anúncio
        </Text>
        <Text style={styles.muted}>
          O motivo estruturado ajuda a medir resultados da Beta sem transformar
          o encerramento em uma penalidade.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Por que este anúncio será encerrado?
        </Text>
        {reasons.map((item) => (
          <AppButton
            key={item.value}
            label={item.label}
            onPress={() => setReason(item.value)}
            variant={reason === item.value ? "primary" : "secondary"}
          />
        ))}
        <Field
          label="Detalhes opcionais"
          multiline
          value={detail}
          onChangeText={setDetail}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          disabled={busy}
          label={busy ? "Encerrando..." : "Confirmar encerramento"}
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
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  error: { color: colors.danger, lineHeight: 20 },
});
