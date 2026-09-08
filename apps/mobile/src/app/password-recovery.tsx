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
import { BrandHeader } from "@/components/BrandHeader";
import { AppButton } from "@/components/ui/AppButton";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

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
      <View style={styles.topBar}>
        <Text onPress={() => router.back()} style={styles.back}>
          ‹
        </Text>
        <BrandHeader compact />
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Recuperar acesso
          </Text>
          <Text style={styles.subtitle}>
            Informe seu e-mail e enviaremos as instruções disponíveis para sua
            conta.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>E-mail</Text>
          <TextInput
            accessibilityLabel="E-mail para recuperação"
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

        {submitted ? (
          <View style={styles.notice}>
            <View style={styles.noticeIcon}>
              <Text style={styles.noticeIconText}>✉</Text>
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
              Se houver uma conta com esse e-mail, as instruções de recuperação
              serão disponibilizadas pelo canal configurado para a Beta.
            </Text>
          </View>
        ) : (
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>✓</Text>
            <Text style={styles.securityText}>
              Por segurança, mostramos a mesma confirmação mesmo quando o e-mail
              não está cadastrado.
            </Text>
          </View>
        )}

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <AppButton
          disabled={submitting}
          label={submitting ? "Enviando..." : "Enviar link de recuperação"}
          onPress={() => void submit()}
        />
        <Text
          accessibilityRole="link"
          onPress={() => router.replace("/login")}
          style={styles.loginLink}
        >
          Voltar para o login
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 40,
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 32,
    lineHeight: 40,
  },
  topSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.7,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
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
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  noticeIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.surface,
  },
  noticeIconText: {
    color: colors.primary,
    fontSize: 20,
  },
  noticeText: {
    flex: 1,
    color: colors.primaryPressed,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  securityNote: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  securityIcon: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
  },
  securityText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  loginLink: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    textAlign: "center",
    padding: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
});
