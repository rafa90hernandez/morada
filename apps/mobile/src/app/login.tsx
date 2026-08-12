import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const {
    clearSessionExpired,
    sessionExpired,
    signIn,
    signingIn,
  } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      clearSessionExpired();
    },
    [clearSessionExpired],
  );

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }

    setError(null);
    try {
      await signIn(email, password);
      if (params.returnTo) {
        router.replace(params.returnTo as never);
      } else {
        router.replace("/conversations");
      }
    } catch {
      setError(
        "Não foi possível entrar. Confira seus dados ou tente novamente em instantes.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Entre para continuar
        </Text>
        <Text style={styles.subtitle}>
          Sua sessão é usada para acessar apenas suas conversas, visitas e
          notificações. O Morada não mostra presença online nem confirmação de
          leitura nesta beta.
        </Text>

        {sessionExpired ? (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            Sua sessão expirou. Entre novamente para continuar com segurança.
          </Text>
        ) : null}

        <TextInput
          accessibilityLabel="E-mail"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="seu@email.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
        />
        <TextInput
          accessibilityLabel="Senha"
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          accessibilityLabel={signingIn ? "Entrando" : "Entrar"}
          disabled={signingIn}
          label={signingIn ? "Entrando..." : "Entrar"}
          onPress={() => void submit()}
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
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
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
  error: {
    color: colors.danger ?? "#B42318",
    lineHeight: 20,
  },
});
