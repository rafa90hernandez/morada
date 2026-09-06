import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { router } from "expo-router";
import {
  Pressable,
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
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProductState } from "@/components/ui/ProductState";
import {
  brazilianDateToIso,
  formatBrazilianDateInput,
  isoToBrazilianDate,
} from "@/features/listings/input-formatters";
import {
  countrySuggestions,
  irelandCitySuggestions,
  matchingSuggestions,
} from "@/features/listings/location-suggestions";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

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
    setDateOfBirth(isoToBrazilianDate(nextUser.profile?.dateOfBirth));
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
    if (dateOfBirth.trim()) {
      const isoDate = brazilianDateToIso(dateOfBirth.trim());
      if (!isoDate) {
        setError(
          "Informe uma data de nascimento válida no formato DD/MM/AAAA.",
        );
        return;
      }
      update.dateOfBirth = isoDate;
    }
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
      setError("Não foi possível salvar. Confira os campos e tente novamente.");
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
        <ProductState
          description="Estamos carregando seus dados e verificações registradas."
          kind="loading"
          title="Carregando perfil"
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerState}>
        <ProductState
          actionLabel="Tentar novamente"
          description={error ?? "Tente novamente."}
          kind="error"
          onAction={() => void load()}
          title="Não foi possível abrir seu perfil"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppCard tone="muted">
        <Text style={styles.eyebrow}>SEU ESPAÇO NO MORADA</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Perfil
        </Text>
        <Text style={styles.muted}>{user.email}</Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Elegibilidade</Text>
          <Text style={styles.statusText}>{statusLabel(user)}</Text>
        </View>

        <View style={styles.verificationRow}>
          <AppBadge
            label={user.emailVerified ? "E-mail verificado" : "E-mail pendente"}
            tone={user.emailVerified ? "success" : "neutral"}
          />
          <AppBadge
            label={
              user.phoneVerified ? "Telefone verificado" : "Telefone pendente"
            }
            tone={user.phoneVerified ? "success" : "neutral"}
          />
        </View>
        <Text style={styles.helper}>
          Estes estados mostram apenas verificações já registradas pelo servidor.
          O Morada não promete envio de SMS ou e-mail enquanto um provedor de
          verificação não estiver ativado para a Beta.
        </Text>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Sobre você</Text>
        <Text style={styles.muted}>
          Complete o perfil para dar mais contexto às suas interações na
          comunidade.
        </Text>
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
          keyboardType="number-pad"
          label="Data de nascimento"
          maxLength={10}
          onChangeText={(value) =>
            setDateOfBirth(formatBrazilianDateInput(value))
          }
          placeholder="DD/MM/AAAA"
          value={dateOfBirth}
        />
        <Field
          label="Nacionalidade"
          onChangeText={setNationality}
          suggestions={countrySuggestions}
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
          suggestions={irelandCitySuggestions}
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
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Segurança e preferências</Text>
        <AppButton
          label="Verificação de identidade"
          onPress={() => router.push("/identity-verification")}
          variant="secondary"
        />
        <AppButton
          label="Notificações"
          onPress={() => router.push("/notifications")}
          variant="secondary"
        />
        <AppButton label="Sair" onPress={leave} variant="secondary" />
      </AppCard>
    </ScrollView>
  );
}

type FieldProps = { label: string; suggestions?: string[] } & ComponentProps<
  typeof TextInput
>;

function Field({ label, suggestions, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(
    () => matchingSuggestions(String(props.value ?? ""), suggestions ?? []),
    [props.value, suggestions],
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.multiline]}
        {...props}
      />
      {focused && matches.length > 0 ? (
        <View style={styles.suggestionList}>
          {matches.map((suggestion) => (
            <Pressable
              accessibilityRole="button"
              key={suggestion}
              onPress={() => {
                props.onChangeText?.(suggestion);
                setFocused(false);
              }}
              style={styles.suggestionItem}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
  suggestionList: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  suggestionItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontWeight: "600",
  },
  switchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
  },
  success: {
    color: colors.primary,
    fontWeight: "700",
  },
});
