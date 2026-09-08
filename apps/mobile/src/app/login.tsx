import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

export default function LoginScreen() {
  const params = useLocalSearchParams<{
    returnTo?: string;
    passwordReset?: string;
  }>();
  const { clearSessionExpired, sessionExpired, signIn, signingIn } =
    useSession();
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
      router.replace((params.returnTo || "/") as never);
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandArea}>
          <BrandHeader align="center" inverted showTagline />
          <Text style={styles.brandMessage}>
            Brasileiros sem fronteiras, sempre em casa.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Bem-vindo de volta
            </Text>
            <Text style={styles.subtitle}>
              Entre para encontrar moradias, conversar com anunciantes e cuidar
              da sua conta.
            </Text>
          </View>

          {sessionExpired ? (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              Sua sessão expirou. Entre novamente para continuar com segurança.
            </Text>
          ) : null}
          {params.passwordReset === "true" ? (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              Senha alterada. Entre novamente com a nova senha.
            </Text>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>E-mail</Text>
            <TextInput
              accessibilityLabel="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Senha</Text>
            <TextInput
              accessibilityLabel="Senha"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Sua senha"
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

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
          <AppButton
            label="Esqueci minha senha"
            onPress={() => router.push("/password-recovery")}
            variant="secondary"
          />

          <View style={styles.divider} />

          <Text style={styles.createHint}>Ainda não tem uma conta?</Text>
          <AppButton
            label="Criar minha conta"
            onPress={() => router.push("/signup")}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryPressed,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  brandArea: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  brandMessage: {
    maxWidth: 280,
    color: colors.wellbeing,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  card: {
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  heading: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  notice: {
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    color: colors.primaryPressed,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
    padding: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  createHint: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
});
