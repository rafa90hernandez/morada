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
import { BrandHeader } from "@/components/BrandHeader";
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
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

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

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "M"
  );
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

  const profileName = user.profile?.displayName || displayName || "Morador";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <BrandHeader compact />
        <Text style={styles.settingsIcon}>⚙</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profileName)}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text accessibilityRole="header" style={styles.profileName}>
            {profileName}
          </Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <Text style={styles.profileMeta}>{statusLabel(user)}</Text>
        </View>
      </View>

      <AppCard style={styles.statusCard}>
        <View style={styles.statusLine}>
          <View style={styles.statusIconWrap}>
            <Text style={styles.statusIcon}>✓</Text>
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Verificação de identidade</Text>
            <Text style={styles.statusText}>
              Proteja sua conta e aumente a confiança na comunidade.
            </Text>
          </View>
          <AppButton
            label="Abrir"
            onPress={() => router.push("/identity-verification")}
            variant="secondary"
          />
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
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Sobre você</Text>
        <Text style={styles.muted}>
          Complete seu perfil para dar mais contexto às suas interações no Morada.
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
          <View style={styles.switchCopy}>
            <Text style={styles.label}>Sou estudante</Text>
            <Text style={styles.helper}>Essa informação ajuda a contextualizar seu perfil.</Text>
          </View>
          <Switch
            accessibilityLabel="Sou estudante"
            onValueChange={setIsStudent}
            trackColor={{ true: colors.primarySoft }}
            thumbColor={isStudent ? colors.primary : undefined}
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
        <Text style={styles.sectionTitle}>Conta e segurança</Text>
        <MenuRow
          label="Notificações"
          onPress={() => router.push("/notifications")}
          symbol="♢"
        />
        <MenuRow label="Usuários bloqueados" symbol="⊘" />
        <MenuRow label="Suporte" symbol="?" />
        <MenuRow label="Termos de uso e privacidade" symbol="▤" />
        <View style={styles.menuDivider} />
        <Pressable accessibilityRole="button" onPress={leave} style={styles.menuRow}>
          <View style={[styles.menuSymbol, styles.dangerSymbol]}>
            <Text style={styles.dangerSymbolText}>↪</Text>
          </View>
          <Text style={styles.dangerMenuText}>Sair da conta</Text>
        </Pressable>
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
        placeholderTextColor={colors.textSubtle}
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

function MenuRow({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={styles.menuRow}
    >
      <View style={styles.menuSymbol}>
        <Text style={styles.menuSymbolText}>{symbol}</Text>
      </View>
      <Text style={styles.menuText}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
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
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsIcon: {
    color: colors.textMuted,
    fontSize: 22,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
  },
  avatarText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
  },
  profileEmail: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  profileMeta: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  statusCard: {
    gap: spacing.md,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusIconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
  },
  statusIcon: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
  },
  statusCopy: {
    flex: 1,
    gap: 2,
  },
  statusTitle: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  statusText: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  verificationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: 19,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 21,
  },
  helper: {
    color: colors.textSubtle,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 15,
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
    fontFamily: fontFamily.semibold,
  },
  switchRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  menuRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  menuSymbol: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
  },
  menuSymbolText: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
  },
  menuText: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  chevron: {
    color: colors.textSubtle,
    fontSize: 24,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dangerSymbol: {
    backgroundColor: colors.dangerSoft,
  },
  dangerSymbolText: {
    color: colors.danger,
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
  },
  dangerMenuText: {
    flex: 1,
    color: colors.danger,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
  success: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
});
