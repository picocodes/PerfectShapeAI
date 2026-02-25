import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../../App";

const C = {
  mint: "#2EC4B6",
  coral: "#FF6B6B",
  sun: "#FFBF69",
  midnight: "#1A1B26",
  cream: "#F7F3EE",
  ink: "#0C0C0C",
};

const XP_PER_LEVEL = 500;

interface TodayWorkoutResponse {
  workout: { id: string; name: string; exercises: { name: string; reps?: string; duration?: string }[] } | null;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { xp, setXp } = useAppStore();
  const [workoutName, setWorkoutName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [workoutRes, xpRes] = await Promise.all([
          apiFetch<TodayWorkoutResponse>("/workouts/today"),
          apiFetch<{ total_xp: number; level: number; streak_count: number }>("/gamification/xp"),
        ]);
        if (!cancelled) {
          setWorkoutName(workoutRes.workout?.name ?? null);
          setXp(xpRes);
        }
      } catch {
        // fall through to mock data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [setXp]);

  const streakCount = xp?.streak_count ?? 4;
  const level = xp?.level ?? 1;
  const totalXp = xp?.total_xp ?? 0;
  const xpProgress = (totalXp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const xpInLevel = totalXp % XP_PER_LEVEL;

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.mint} />
        <Text style={[styles.subtitle, { marginTop: 12 }]}>Loading your plan…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Today's plan</Text>
          <Text style={styles.subtitle}>Keep the streak alive 🔥</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv {level}</Text>
        </View>
      </View>

      {/* XP bar */}
      <View style={styles.xpContainer}>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` as `${number}%` }]} />
        </View>
        <Text style={styles.xpLabel}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>
      </View>

      {/* Workout card */}
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("Workout")}
      >
        <Text style={styles.cardLabel}>TODAY'S WORKOUT</Text>
        <Text style={styles.cardTitle}>
          {workoutName ?? "15-min Core Ignition"}
        </Text>
        <View style={[styles.btn, { backgroundColor: C.midnight }]}>
          <Text style={styles.btnText}>Start workout →</Text>
        </View>
      </Pressable>

      {/* Streak card */}
      <View style={[styles.card, { backgroundColor: C.midnight }]}>
        <Text style={[styles.cardLabel, { color: "rgba(247,243,238,0.6)" }]}>STREAK</Text>
        <Text style={[styles.streakCount, { color: C.sun }]}>🔥 {streakCount} days</Text>
        <Text style={[styles.subtitle, { color: "rgba(247,243,238,0.6)" }]}>
          Don't break the chain!
        </Text>
      </View>

      {/* Nav row */}
      <View style={styles.navRow}>
        <Pressable style={[styles.navBtn, { backgroundColor: C.sun }]} onPress={() => navigation.navigate("Weight")}>
          <Text style={styles.navBtnIcon}>⚖️</Text>
          <Text style={styles.navBtnLabel}>Weight</Text>
        </Pressable>
        <Pressable style={[styles.navBtn, { backgroundColor: C.mint }]} onPress={() => navigation.navigate("Coach")}>
          <Text style={styles.navBtnIcon}>🤖</Text>
          <Text style={styles.navBtnLabel}>Coach</Text>
        </Pressable>
        <Pressable style={[styles.navBtn, { backgroundColor: C.coral }]} onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.navBtnIcon}>👤</Text>
          <Text style={styles.navBtnLabel}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    backgroundColor: C.cream,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 12,
  },
  title: { fontSize: 28, fontWeight: "800", color: C.ink },
  subtitle: { fontSize: 14, color: "rgba(12,12,12,0.55)", marginTop: 2 },
  levelBadge: {
    backgroundColor: C.mint,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  levelText: { fontWeight: "800", fontSize: 14, color: C.ink },
  xpContainer: { gap: 4 },
  xpBarBg: {
    height: 8,
    backgroundColor: "rgba(12,12,12,0.08)",
    borderRadius: 999,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: C.mint,
    borderRadius: 999,
  },
  xpLabel: { fontSize: 11, color: "rgba(12,12,12,0.45)", textAlign: "right" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    gap: 6,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(12,12,12,0.4)",
    textTransform: "uppercase",
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: C.ink },
  streakCount: { fontSize: 28, fontWeight: "800" },
  btn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  btnText: { color: C.cream, fontWeight: "700", fontSize: 14 },
  navRow: { flexDirection: "row", gap: 10, marginTop: "auto" },
  navBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  navBtnIcon: { fontSize: 22 },
  navBtnLabel: { fontSize: 12, fontWeight: "700", color: C.ink },
});

