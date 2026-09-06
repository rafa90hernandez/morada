import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, layout, radius, spacing, typeScale } from "@/theme/tokens";

type AppButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary" | "danger";
};

export function AppButton({
  label,
  disabled,
  style,
  variant = "primary",
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        state.pressed && variant === "primary" && styles.primaryPressed,
        state.pressed && variant === "secondary" && styles.secondaryPressed,
        state.pressed && variant === "danger" && styles.dangerPressed,
        disabled && styles.disabled,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.label,
          variant === "secondary" && styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  dangerPressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.surface,
    fontSize: typeScale.bodySmall,
    fontWeight: "800",
  },
  secondaryLabel: {
    color: colors.text,
  },
});
