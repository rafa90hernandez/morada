import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, radius, spacing, typeScale } from "@/theme/tokens";

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
      <View
        style={[
          styles.dot,
          tone === "primary" && styles.primaryDot,
          tone === "success" && styles.successDot,
          tone === "warning" && styles.warningDot,
          tone === "danger" && styles.dangerDot,
        ]}
      />
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
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: typeScale.caption,
  },
  primary: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
  },
  success: {
    borderColor: colors.successSoft,
    backgroundColor: colors.successSoft,
  },
  warning: {
    borderColor: colors.warningSoft,
    backgroundColor: colors.warningSoft,
  },
  danger: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  primaryDot: { backgroundColor: colors.primary },
  successDot: { backgroundColor: colors.success },
  warningDot: { backgroundColor: colors.warning },
  dangerDot: { backgroundColor: colors.danger },
  primaryLabel: { color: colors.primary },
  successLabel: { color: colors.success },
  warningLabel: { color: colors.warning },
  dangerLabel: { color: colors.danger },
});
