import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { resetPassword } from "@/api/password-recovery";
import { AppButton } from "@/components/ui/AppButton";
import { colors, radius, spacing } from "@/theme/tokens";

export default function PasswordResetScreen() {
  const params = useLocalSearchParams<{ token?: string; development?: string }>();
  const [token, setToken] = useState(
    typeof params.token === "string" ? params.token : "",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token.trim()) {
      setError("O código de recuperação é obrigatório.");
      return;
    }
    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token.trim(), password);
      router.replace({ pathname: "/login", params: { passwordReset: "true" } });
    } catch {
      setError(
        "Este código é inválido, expirou ou já foi usado. Solicite uma nova recuperação.",
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
          Criar nova senha
        </Text>
        <Text style={styles.subtitle}>
          O código é temporário e funciona uma única vez. Depois da troca, as
          sessões anteriores deixam de ser válidas.
        </Text>

        {params.development === "true" ? (
          <Text style={styles.notice}>
            Ambiente de desenvolvimento: o código foi fornecido diretamente
            pelo backend de teste. Esse comportamento não é habilitado em produção.
          </Text>
        ) : null}

        <TextInput
          accessibilityLabel="Código de recuperação"
          autoCapitalize="none"
          onChangeText={setToken}
          placeholder="Código de recuperação"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={token}
        />
        <TextInput
          accessibilityLabel="Nova senha"
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Nova senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <TextInput
          accessibilityLabel="Confirmar nova senha"
          autoCapitalize="none"
          onChangeText={setConfirmation}
          placeholder="Confirme a nova senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={confirmation}
        />

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          disabled={submitting}
          label={submitting ? "Alterando..." : "Alterar senha"}
          onPress={() => void submit()}
        />
        <AppButton
          label="Solicitar novo código"
          onPress={() => router.replace("/password-recovery")}
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
  notice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    lineHeight: 20,
    padding: spacing.md,
  },
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
  error: { color: colors.danger, lineHeight: 20 },
});
