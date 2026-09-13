// MeowShadow Lab Mobile Design Theme Tokens
// English comments only per project rules

export const Colors = {
  background: "#0B0F19",
  surface: "#131B2E",
  surfaceLight: "#1E293B",
  surfaceCard: "#162032",
  primary: "#6366F1",
  primaryHover: "#4F46E5",
  primaryGlow: "rgba(99, 102, 241, 0.25)",
  accent: "#A855F7",
  accentGlow: "rgba(168, 85, 247, 0.25)",
  accentGreen: "#10B981",
  accentYellow: "#F59E0B",
  accentRed: "#EF4444",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#1E293B",
  borderLight: "#334155",
  borderActive: "#6366F1",
  shadow: "rgba(0, 0, 0, 0.5)",
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
};
