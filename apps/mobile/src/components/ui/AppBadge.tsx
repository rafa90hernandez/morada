import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typeScale } from "@/theme/tokens";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

type AppBadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function AppBadge({ label, tone = "neutral" }: AppBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        tone === "primary" && styles.primary,
        tone === "success" && styles.success,
        tone === "warning" && styles.warning,
        tone === "danger" && styles.danger,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === "primary" && styles.primaryLabel,
          tone === "success" && styles.successLabel,
          tone === "warning" && styles.warningLabel,
          tone === "danger" && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: "800",
  },
  primary: { backgroundColor: colors.primarySoft },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  primaryLabel: { color: colors.primary },
  successLabel: { color: colors.success },
  warningLabel: { color: colors.warning },
  dangerLabel: { color: colors.danger },
});
