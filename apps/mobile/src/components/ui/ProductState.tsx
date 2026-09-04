import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typeScale } from "@/theme/tokens";
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
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      {kind === "loading" ? (
        <ActivityIndicator color={colors.primary} size="large" />
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
          />
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
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.titleSmall,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    maxWidth: 520,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 21,
    textAlign: "center",
  },
  action: {
    minWidth: 180,
    marginTop: spacing.sm,
  },
});
