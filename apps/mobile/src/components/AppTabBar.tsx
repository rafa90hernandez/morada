import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const tabs = [
  { label: "Explorar", path: "/", symbol: "⌂" },
  { label: "Favoritos", path: "/favorites", symbol: "♡" },
  { label: "Conversas", path: "/conversations", symbol: "◌" },
  { label: "Anunciar", path: "/my-listings", symbol: "+" },
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

  if (!session || hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {tabs.map((tab) => {
        const selected = isSelected(pathname, tab.path);
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.path}
            onPress={() => router.replace(tab.path as never)}
            style={styles.tab}
          >
            <View style={[styles.icon, selected && styles.iconSelected]}>
              <Text style={[styles.symbol, selected && styles.symbolSelected]}>
                {tab.symbol}
              </Text>
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>
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
    minWidth: 30,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  iconSelected: {
    backgroundColor: colors.primarySoft,
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
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  labelSelected: {
    color: colors.primary,
  },
});
