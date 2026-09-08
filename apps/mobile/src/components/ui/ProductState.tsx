import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, radius, spacing, typeScale } from "@/theme/tokens";
import { AppButton } from "./AppButton";

type ProductStateProps = {
  title: string;
  description?: string;
  kind?: "loading" | "empty" | "error" | "success";
  actionLabel?: string;
  onAction?: () => void;
};

export function ProductState({
  title,
  description,
  kind = "empty",
  actionLabel,
  onAction,
}: ProductStateProps) {
  const symbol = kind === "error" ? "!" : kind === "success" ? "✓" : "⌂";

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      {kind === "loading" ? (
        <View style={styles.iconCircle}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : (
        <View
          style={[
            styles.iconCircle,
            kind === "error" && styles.errorCircle,
            kind === "success" && styles.successCircle,
          ]}
        >
          <Text
            style={[
              styles.icon,
              kind === "error" && styles.errorIcon,
              kind === "success" && styles.successIcon,
            ]}
          >
            {symbol}
          </Text>
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  errorCircle: {
    backgroundColor: colors.dangerSoft,
  },
  successCircle: {
    backgroundColor: colors.successSoft,
  },
  icon: {
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    lineHeight: 30,
  },
  errorIcon: {
    color: colors.danger,
  },
  successIcon: {
    color: colors.success,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.extraBold,
    fontSize: typeScale.titleSmall,
    textAlign: "center",
  },
  description: {
    maxWidth: 420,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: typeScale.bodySmall,
    lineHeight: 21,
    textAlign: "center",
  },
  action: {
    minWidth: 190,
    marginTop: spacing.sm,
  },
});
