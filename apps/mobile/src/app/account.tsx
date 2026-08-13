import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getMyProfile,
  updateMyProfile,
  type PrivateUser,
  type UpdatePrivateProfile,
} from "@/api/account";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function statusLabel(user: PrivateUser) {
  if (user.eligibility.isEligible) {
    return user.eligibility.age === null
      ? "Elegível para a Beta 1"
      : `${user.eligibility.age} anos · elegível para a Beta 1`;
  }

  if (user.eligibility.reason === "MISSING_DATE_OF_BIRTH") {
    return "Informe sua data de nascimento para confirmar a elegibilidade 18+.";
  }

  return "A Beta 1 do Morada é destinada somente a pessoas com 18 anos ou mais.";
}

export default function AccountScreen() {
  const { session, signOut } = useSession();
  const [user, setUser] = useState<PrivateUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [hometown, setHometown] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [isStudent, setIsStudent] = useState(false);

  const applyUser = useCallback((nextUser: PrivateUser) => {
    setUser(nextUser);
    setDisplayName(nextUser.profile?.displayName ?? "");
    setFullName(nextUser.profile?.fullName ?? "");
    setDateOfBirth(dateInputValue(nextUser.profile?.dateOfBirth));
    setNationality(nextUser.profile?.nationality ?? "");
    setHometown(nextUser.profile?.hometown ?? "");
    setCurrentCity(nextUser.profile?.currentCity ?? "");
    setOccupation(nextUser.profile?.occupation ?? "");
    setBio(nextUser.profile?.bio ?? "");
    setIsStudent(nextUser.profile?.isStudent ?? false);
  }, []);

  const handleUnauthorized = useCallback(() => {
    signOut();
    router.replace({ pathname: "/login", params: { returnTo: "/account" } });
  }, [signOut]);

  const load = useCallback(async () => {
    if (!session) {
      router.replace({ pathname: "/login", params: { returnTo: "/account" } });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      applyUser(await getMyProfile(session.accessToken));
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        handleUnauthorized();
        return;
      }
      setError("Não foi possível carregar sua conta agora.");
    } finally {
      setLoading(false);
    }
  }, [applyUser, handleUnauthorized, session]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!session) return;
    if (!displayName.trim()) {
      setError("Informe o nome que será exibido no Morada.");
      return;
    }

    const update: UpdatePrivateProfile = {
      displayName: displayName.trim(),
      isStudent,
    };

    if (fullName.trim()) update.fullName = fullName.trim();
    if (dateOfBirth.trim()) update.dateOfBirth = dateOfBirth.trim();
    if (nationality.trim()) update.nationality = nationality.trim();
    if (hometown.trim()) update.hometown = hometown.trim();
    if (currentCity.trim()) update.currentCity = currentCity.trim();
    if (occupation.trim()) update.occupation = occupation.trim();
    if (bio.trim()) update.bio = bio.trim();

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      applyUser(await updateMyProfile(session.accessToken, update));
      setSaved(true);
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        handleUnauthorized();
        return;
      }
      setError(
        "Não foi possível salvar. Confira os campos — inclusive a data no formato AAAA-MM-DD — e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando sua conta...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.title}>Não foi possível abrir sua conta</Text>
        <Text style={styles.muted}>{error ?? "Tente novamente."}</Text>
        <AppButton label="Tentar novamente" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Minha conta
        </Text>
        <Text style={styles.muted}>{user.email}</Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Elegibilidade</Text>
          <Text style={styles.statusText}>{statusLabel(user)}</Text>
        </View>

        <View style={styles.verificationRow}>
          <Text style={styles.verificationText}>
            E-mail: {user.emailVerified ? "verificado" : "não verificado"}
          </Text>
          <Text style={styles.verificationText}>
            Telefone: {user.phoneVerified ? "verificado" : "não verificado"}
          </Text>
        </View>
        <Text style={styles.helper}>
          O aplicativo mostra o estado registrado pelo servidor. Ele não promete
          envio de SMS ou e-mail enquanto um provedor de verificação não estiver
          ativado para a Beta.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        <Field
          label="Nome exibido"
          onChangeText={setDisplayName}
          value={displayName}
        />
        <Field
          label="Nome completo (privado)"
          onChangeText={setFullName}
          value={fullName}
        />
        <Field
          autoCapitalize="none"
          label="Data de nascimento (AAAA-MM-DD)"
          onChangeText={setDateOfBirth}
          value={dateOfBirth}
        />
        <Field
          label="Nacionalidade"
          onChangeText={setNationality}
          value={nationality}
        />
        <Field
          label="Cidade de origem"
          onChangeText={setHometown}
          value={hometown}
        />
        <Field
          label="Cidade atual"
          onChangeText={setCurrentCity}
          value={currentCity}
        />
        <Field
          label="Ocupação"
          onChangeText={setOccupation}
          value={occupation}
        />
        <Field label="Sobre você" multiline onChangeText={setBio} value={bio} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Sou estudante</Text>
          <Switch
            accessibilityLabel="Sou estudante"
            onValueChange={setIsStudent}
            value={isStudent}
          />
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            Perfil atualizado.
          </Text>
        ) : null}

        <AppButton
          disabled={saving}
          label={saving ? "Salvando..." : "Salvar perfil"}
          onPress={() => void save()}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Atalhos</Text>
        <AppButton label="Explorar moradias" onPress={() => router.push("/")} />
        <AppButton
          label="Verificação de identidade"
          onPress={() => router.push("/identity-verification")}
          variant="secondary"
        />
        <AppButton
          label="Conversas"
          onPress={() => router.push("/conversations")}
          variant="secondary"
        />
        <AppButton
          label="Notificações"
          onPress={() => router.push("/notifications")}
          variant="secondary"
        />
        <AppButton label="Sair" onPress={leave} variant="secondary" />
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
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
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
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  statusBox: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  statusTitle: {
    color: colors.primary,
    fontWeight: "800",
  },
  statusText: {
    color: colors.text,
    lineHeight: 20,
  },
  verificationRow: {
    gap: spacing.xs,
  },
  verificationText: {
    color: colors.text,
    fontWeight: "700",
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  multiline: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  switchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  error: {
    color: colors.danger ?? "#B42318",
    lineHeight: 20,
  },
  success: {
    color: colors.primary,
    fontWeight: "700",
  },
});
