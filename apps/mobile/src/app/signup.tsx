import { useState } from "react";
import { router } from "expo-router";
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

export default function SignupScreen() {
  const { registering, signUp } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      setError("Informe seu nome, e-mail e senha.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setError(null);
    try {
      await signUp({
        displayName,
        email,
        password,
        phone: phone || undefined,
      });
      router.replace("/");
    } catch (caught) {
      const status = (caught as Error & { status?: number }).status;
      if (status === 409) {
        setError("Já existe uma conta com este e-mail.");
        return;
      }
      if (status === 429) {
        setError("Muitas tentativas. Aguarde um pouco e tente novamente.");
        return;
      }
      setError("Não foi possível criar sua conta agora.");
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
        <View style={styles.topBar}>
          <BrandHeader compact />
          <Text
            onPress={() => router.replace("/login")}
            style={styles.topAction}
          >
            Entrar
          </Text>
        </View>

        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Crie sua conta
          </Text>
          <Text style={styles.subtitle}>
            Junte-se a brasileiros na Irlanda e encontre um novo lugar para
            chamar de casa.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nome completo</Text>
            <TextInput
              accessibilityLabel="Nome exibido"
              autoCapitalize="words"
              onChangeText={setDisplayName}
              placeholder="Ex.: Rafael Silva"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={displayName}
            />
          </View>

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
            <Text style={styles.fieldLabel}>Telefone</Text>
            <TextInput
              accessibilityLabel="Telefone opcional"
              autoCapitalize="none"
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+353 87 123 4567"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={phone}
            />
            <Text style={styles.fieldHint}>Opcional. Você pode completar depois.</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Senha</Text>
            <TextInput
              accessibilityLabel="Senha"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Mínimo de 8 caracteres"
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <View style={styles.trustNote}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              Seus dados privados ficam protegidos. Verificações de identidade e
              autorização podem ser concluídas na sua conta.
            </Text>
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <AppButton
            disabled={registering}
            label={registering ? "Criando conta..." : "Criar conta"}
            onPress={() => void submit()}
          />

          <Text style={styles.legalCopy}>
            Ao criar sua conta, você confirma que leu os termos e informações de
            privacidade disponibilizados pelo Morada.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topAction: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    padding: spacing.sm,
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
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  fieldHint: {
    color: colors.textSubtle,
    fontFamily: fontFamily.regular,
    fontSize: 12,
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
  trustNote: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  trustIcon: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  trustText: {
    flex: 1,
    color: colors.primaryPressed,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  legalCopy: {
    color: colors.textSubtle,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
});
