import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "../services/firebase";
import { apiFetch } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { UserProfile, XpData } from "../store/useAppStore";
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

function capitalize(s?: string) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUser, setXp } = useAppStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [xpData, setXpData] = useState<XpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [prof, xp] = await Promise.all([
          apiFetch<UserProfile>("/users/me"),
          apiFetch<XpData>("/gamification/xp"),
        ]);
        if (!cancelled) {
          setProfile(prof);
          setXpData(xp);
        }
      } catch {
        // keep loading state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut(getFirebaseAuth());
      setUser(null);
      setXp(null);
      navigation.replace("Login");
    } catch {
      setLoggingOut(false);
    }
  }

  const xpInLevel = (xpData?.total_xp ?? 0) % XP_PER_LEVEL;
  const xpProgress = xpInLevel / XP_PER_LEVEL;
  const level = xpData?.level ?? 1;

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.mint} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.cream }} contentContainerStyle={styles.screen}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name ? profile.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <Text style={styles.userName}>{profile?.name ?? "Your Profile"}</Text>
        <Text style={styles.userEmail}>{profile?.email ?? ""}</Text>
      </View>

      {/* XP progress */}
      <View style={styles.card}>
        <View style={styles.xpHeader}>
          <Text style={styles.sectionLabel}>XP PROGRESS</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Level {level}</Text>
          </View>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` as `${number}%` }]} />
        </View>
        <Text style={styles.xpDetails}>
          {xpInLevel} / {XP_PER_LEVEL} XP to next level
          {xpData ? ` · ${xpData.streak_count} day streak` : ""}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>YOUR STATS</Text>
        <View style={styles.statGrid}>
          <StatItem label="Current weight" value={profile?.current_weight ? `${profile.current_weight} kg` : "—"} />
          <StatItem label="Target weight" value={profile?.target_weight ? `${profile.target_weight} kg` : "—"} />
          <StatItem label="Height" value={profile?.height ? `${profile.height} cm` : "—"} />
          <StatItem label="Activity" value={capitalize(profile?.activity_level)} />
          <StatItem label="Diet" value={capitalize(profile?.dietary_preference)} />
          <StatItem label="Workout time" value={profile?.workout_time ? `${profile.workout_time} min` : "—"} />
        </View>
      </View>

      {/* Subscription */}
      <View style={[styles.card, { backgroundColor: C.midnight }]}>
        <Text style={[styles.sectionLabel, { color: "rgba(247,243,238,0.5)" }]}>SUBSCRIPTION</Text>
        <Text style={styles.subStatus}>
          {profile?.subscription_status === "active" ? "Premium Active" : "Free Plan"}
        </Text>
        {profile?.subscription_status !== "active" && (
          <Text style={[styles.subNote, { color: "rgba(247,243,238,0.55)" }]}>
            Upgrade for unlimited AI coaching and plans.
          </Text>
        )}
      </View>

      {/* Log out */}
      <Pressable
        style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color={C.coral} />
        ) : (
          <Text style={styles.logoutText}>Log out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.item}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: { width: "48%", marginBottom: 12 },
  label: { fontSize: 11, color: "rgba(12,12,12,0.45)", marginBottom: 2 },
  value: { fontSize: 15, fontWeight: "700", color: C.ink },
});

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 14,
    paddingBottom: 40,
  },
  backBtn: { marginTop: 12, alignSelf: "flex-start" },
  backText: { fontSize: 14, color: "rgba(12,12,12,0.5)", fontWeight: "600" },
  avatarSection: { alignItems: "center", gap: 6, paddingVertical: 12 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.mint,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "800", color: C.ink },
  userName: { fontSize: 22, fontWeight: "800", color: C.ink },
  userEmail: { fontSize: 13, color: "rgba(12,12,12,0.45)" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(12,12,12,0.4)",
    textTransform: "uppercase",
  },
  xpHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: {
    backgroundColor: C.mint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  levelText: { fontSize: 12, fontWeight: "800", color: C.ink },
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
  xpDetails: { fontSize: 12, color: "rgba(12,12,12,0.5)" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  subStatus: { fontSize: 18, fontWeight: "800", color: C.sun },
  subNote: { fontSize: 13 },
  logoutBtn: {
    borderWidth: 2,
    borderColor: C.coral,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  logoutText: { color: C.coral, fontWeight: "800", fontSize: 15 },
});
