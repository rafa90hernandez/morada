import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

type AppButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  label,
  disabled,
  style,
  variant = 'primary',
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: colors.text,
  },
});
