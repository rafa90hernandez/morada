import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";

type AppCardProps = PropsWithChildren<
  ViewProps & {
    tone?: "default" | "muted" | "warm";
  }
>;

export function AppCard({ children, style, tone = "default", ...props }: AppCardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === "muted" && styles.muted,
        tone === "warm" && styles.warm,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
  },
  warm: {
    backgroundColor: colors.surfaceWarm,
  },
});
