export const BrandColors = {
  ink: "#0C0C0C",
  cream: "#F7F3EE",
  mint: "#2EC4B6",
  coral: "#FF6B6B",
  sun: "#FFBF69",
  fog: "#E2E8F0",
  midnight: "#1A1B26"
} as const;

export const Gradients = {
  sunrise: "linear-gradient(135deg, #FFBF69 0%, #FF6B6B 45%, #2EC4B6 100%)",
  dusk: "linear-gradient(135deg, #1A1B26 0%, #2EC4B6 100%)"
} as const;

export const Radii = {
  card: 20,
  pill: 999,
  soft: 12
} as const;

export const Shadows = {
  soft: "0 16px 40px rgba(12, 12, 12, 0.12)",
  tight: "0 8px 24px rgba(12, 12, 12, 0.16)"
} as const;

export const Fonts = {
  display: "'Syne', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif"
} as const;

export const Motion = {
  fast: "180ms",
  base: "260ms",
  slow: "420ms"
} as const;
