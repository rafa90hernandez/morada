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

import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

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
      router.replace("/account");
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Criar conta
          </Text>
          <Text style={styles.subtitle}>
            Comece com seus dados básicos. A confirmação de elegibilidade 18+
            e os dados privados do perfil são concluídos na sua conta.
          </Text>

          <TextInput
            accessibilityLabel="Nome exibido"
            autoCapitalize="words"
            onChangeText={setDisplayName}
            placeholder="Como quer ser chamado"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={displayName}
          />
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
            accessibilityLabel="Telefone opcional"
            autoCapitalize="none"
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="Telefone (opcional)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={phone}
          />
          <TextInput
            accessibilityLabel="Senha"
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Senha (mínimo 8 caracteres)"
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
            disabled={registering}
            label={registering ? "Criando conta..." : "Criar conta"}
            onPress={() => void submit()}
          />
          <AppButton
            label="Já tenho uma conta"
            onPress={() => router.replace("/login")}
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
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
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
