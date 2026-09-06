import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const tabs = [
  { label: "Explorar", path: "/", symbol: "⌂" },
  { label: "Favoritos", path: "/favorites", symbol: "♡" },
  { label: "Conversas", path: "/conversations", symbol: "◌" },
  { label: "Anunciar", path: "/my-listings", symbol: "+", action: true },
  { label: "Perfil", path: "/account", symbol: "○" },
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
            style={styles.tab}
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    minHeight: 48,
  },
  icon: {
    minWidth: 34,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  iconSelected: {
    backgroundColor: colors.primarySoft,
  },
  actionIcon: {
    minWidth: 44,
    height: 32,
    backgroundColor: colors.accent,
  },
  actionIconSelected: {
    backgroundColor: colors.accentPressed,
  },
  symbol: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
  },
  symbolSelected: {
    color: colors.primary,
  },
  actionSymbol: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: "900",
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  labelSelected: {
    color: colors.primary,
  },
  actionLabel: {
    color: colors.navy,
    fontWeight: "800",
  },
});
