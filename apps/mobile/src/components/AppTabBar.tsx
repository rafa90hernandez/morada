import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/session/SessionContext";
import { colors, fontFamily, radius, spacing } from "@/theme/tokens";

const tabs = [
  { label: "Explorar", path: "/", symbol: "⌂" },
  { label: "Favoritos", path: "/favorites", symbol: "♡" },
  { label: "Anunciar", path: "/my-listings", symbol: "+", action: true },
  { label: "Conversas", path: "/conversations", symbol: "💬" },
  { label: "Perfil", path: "/account", symbol: "👤" },
] as const;

const hiddenPrefixes = [
  "/login",
  "/signup",
  "/password-",
  "/listing/",
  "/listing-owner/",
  "/listing-editor",
  "/listing-location",
  "/listing-authorization",
  "/listing-close",
  "/identity-verification",
  "/report",
  "/notifications",
];

function isSelected(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  if (path === "/conversations") return pathname.startsWith("/conversations");
  return pathname === path;
}

export function AppTabBar() {
  const pathname = usePathname();
  const { session } = useSession();

  if (
    !session ||
    hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {tabs.map((tab) => {
        const selected = isSelected(pathname, tab.path);
        const action = "action" in tab && tab.action;

        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.path}
            onPress={() => router.replace(tab.path as never)}
            style={({ pressed }) => [
              styles.tab,
              action && styles.actionTab,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.icon,
                selected && styles.iconSelected,
                action && styles.actionIcon,
                action && selected && styles.actionIconSelected,
              ]}
            >
              <Text
                style={[
                  styles.symbol,
                  selected && styles.symbolSelected,
                  action && styles.actionSymbol,
                  (tab.label === "Conversas" || tab.label === "Perfil") &&
                    styles.emojiSymbol,
                ]}
              >
                {tab.symbol}
              </Text>
            </View>
            <Text
              style={[
                styles.label,
                selected && styles.labelSelected,
                action && styles.actionLabel,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    overflow: "visible",
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  actionTab: {
    minHeight: 72,
    marginTop: -22,
    justifyContent: "flex-start",
  },
  pressed: {
    opacity: 0.72,
  },
  icon: {
    minWidth: 36,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  iconSelected: {
    backgroundColor: colors.primarySoft,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  actionIconSelected: {
    backgroundColor: colors.accentPressed,
  },
  symbol: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "700",
  },
  symbolSelected: {
    color: colors.primary,
  },
  emojiSymbol: {
    fontSize: 22,
    lineHeight: 26,
  },
  actionSymbol: {
    color: colors.deepNavy,
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "900",
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  labelSelected: {
    color: colors.primary,
  },
  actionLabel: {
    color: colors.deepNavy,
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    marginTop: 2,
  },
});
