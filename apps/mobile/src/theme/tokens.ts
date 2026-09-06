export const colors = {
  background: "#F8F7EF",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5EE",
  surfaceWarm: "#FFF8E6",
  text: "#0D1B2B",
  textMuted: "#5C6872",
  textSubtle: "#7A858D",
  primary: "#006853",
  primaryPressed: "#005342",
  primarySoft: "#DDF0E9",
  accent: "#F4B400",
  accentPressed: "#D99E00",
  accentSoft: "#FFF1BF",
  secondary: "#0D1B2B",
  secondarySoft: "#E8ECF0",
  deepNavy: "#0D1B2B",
  brazilSoft: "#E7F6D9",
  wellbeing: "#A7D781",
  softGreen: "#A7D781",
  border: "#DCE4DD",
  borderStrong: "#BAC9C0",
  danger: "#B42318",
  dangerSoft: "#FDE8E5",
  warning: "#8A6300",
  warningSoft: "#FFF1BF",
  success: "#006853",
  successSoft: "#DDF0E9",
  shadow: "#07150F",
} as const;

export const brand = {
  name: "morada",
  tagline: "Um recomeço, um novo lar.",
  audience: "Brasileiros na Irlanda",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
  full: 999,
} as const;

export const typeScale = {
  caption: 12,
  bodySmall: 14,
  body: 16,
  titleSmall: 18,
  title: 24,
  display: 32,
} as const;

export const fontFamily = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extraBold: "Manrope_800ExtraBold",
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extraBold: "800",
} as const;

export const layout = {
  minTouchTarget: 48,
  contentMaxWidth: 760,
} as const;
