import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { requestPasswordRecovery } from "@/api/password-recovery";
import { AppButton } from "@/components/ui/AppButton";
import { colors, radius, spacing } from "@/theme/tokens";

export default function PasswordRecoveryScreen() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await requestPasswordRecovery(normalizedEmail);
      setSubmitted(true);

      if (result.developmentToken) {
        router.push({
          pathname: "/password-reset",
          params: { token: result.developmentToken, development: "true" },
        });
      }
    } catch {
      setError(
        "Não foi possível solicitar a recuperação agora. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Recuperar acesso
        </Text>
        <Text style={styles.subtitle}>
          Informe o e-mail da sua conta. Por segurança, o Morada mostra a mesma
          confirmação mesmo quando não existe uma conta com esse endereço.
        </Text>

        <TextInput
          accessibilityLabel="E-mail para recuperação"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="seu@email.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
        />

        {submitted ? (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            Se houver uma conta com esse e-mail, uma instrução de recuperação
            poderá ser enviada pelo canal configurado para a Beta.
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <AppButton
          disabled={submitting}
          label={submitting ? "Enviando..." : "Solicitar recuperação"}
          onPress={() => void submit()}
        />
        <AppButton
          label="Voltar para entrar"
          onPress={() => router.replace("/login")}
          variant="secondary"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.textMuted, lineHeight: 21 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  notice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    lineHeight: 20,
    padding: spacing.md,
  },
  error: { color: colors.danger, lineHeight: 20 },
});
