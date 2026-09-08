import { Image, StyleSheet, Text, View } from "react-native";

import { brand, colors, fontFamily, spacing } from "@/theme/tokens";

type BrandHeaderProps = {
  compact?: boolean;
  showTagline?: boolean;
  align?: "left" | "center";
  inverted?: boolean;
};

export function BrandHeader({
  compact = false,
  showTagline = false,
  align = "left",
  inverted = false,
}: BrandHeaderProps) {
  const centered = align === "center";

  return (
    <View style={[styles.wrapper, centered && styles.centered]}>
      <View style={[styles.lockup, centered && styles.centeredLockup]}>
        <Image
          accessibilityIgnoresInvertColors
          source={require("../../assets/adaptive-icon.png")}
          style={[styles.mark, compact && styles.markCompact]}
        />
        <Text
          style={[
            styles.wordmark,
            compact && styles.wordmarkCompact,
            inverted && styles.inverted,
          ]}
        >
          {brand.name}
        </Text>
      </View>
      {showTagline ? (
        <Text
          style={[
            styles.tagline,
            centered && styles.taglineCentered,
            inverted && styles.taglineInverted,
          ]}
        >
          {brand.tagline}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  centered: {
    alignItems: "center",
  },
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  centeredLockup: {
    justifyContent: "center",
  },
  mark: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  markCompact: {
    width: 30,
    height: 30,
  },
  wordmark: {
    color: colors.deepNavy,
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
    letterSpacing: -1.1,
  },
  wordmarkCompact: {
    fontSize: 22,
    letterSpacing: -0.7,
  },
  inverted: {
    color: colors.surface,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  taglineCentered: {
    textAlign: "center",
  },
  taglineInverted: {
    color: colors.accent,
  },
});
