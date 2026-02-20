import { StyleSheet } from "react-native";
import { BrandColors } from "@shared/design-tokens";

export const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    backgroundColor: BrandColors.cream
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: BrandColors.ink
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(12,12,12,0.6)"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0c0c0c",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: BrandColors.midnight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999
  },
  pillText: {
    color: BrandColors.cream,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 2
  }
});
