export const colors = {
  background: "#F7F8F5",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF2EE",
  surfaceWarm: "#F7F1EA",
  text: "#17211B",
  textMuted: "#66736B",
  textSubtle: "#87918B",
  primary: "#245C45",
  primaryPressed: "#1B4936",
  primarySoft: "#DDEBE4",
  border: "#DDE3DE",
  borderStrong: "#C7D0C9",
  danger: "#B42318",
  dangerSoft: "#FDE8E5",
  warning: "#9A6700",
  warningSoft: "#FFF2CC",
  success: "#18794E",
  successSoft: "#DDF3E8",
  shadow: "#0B1710",
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

export const layout = {
  minTouchTarget: 48,
  contentMaxWidth: 760,
} as const;
