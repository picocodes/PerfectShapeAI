import React, { useEffect, useRef, useState } from "react";
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
import { apiFetch } from "../services/api";
import type { RootStackParamList } from "../../App";

const C = {
  mint: "#2EC4B6",
  coral: "#FF6B6B",
  midnight: "#1A1B26",
  cream: "#F7F3EE",
  ink: "#0C0C0C",
};

interface Exercise {
  name: string;
  reps?: string;
  duration?: string;
}

interface TodayWorkout {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface TodayWorkoutResponse {
  workout: TodayWorkout | null;
}

interface CompleteResponse {
  id: string;
  xp: number;
}

const TIMER_SECONDS = 60;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function WorkoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch<TodayWorkoutResponse>("/workouts/today");
        if (!cancelled) setWorkout(res.workout);
      } catch {
        // fall through to mock
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  async function handleComplete() {
    if (!workout) return;
    setCompleting(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0]!;
      const res = await apiFetch<CompleteResponse>("/workouts/complete", {
        method: "POST",
        body: JSON.stringify({ workout_id: workout.id, date: today }),
      });
      setXpEarned(res.xp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete workout.");
    } finally {
      setCompleting(false);
    }
  }

  const displayWorkout = workout ?? {
    id: "mock",
    name: "Core Ignition",
    exercises: [
      { name: "Mountain climbers", reps: "20 reps" },
      { name: "Plank hold", duration: "30 sec" },
      { name: "Squat pulse", reps: "15 reps" },
    ],
  };

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

      <Text style={styles.title}>{displayWorkout.name}</Text>
      <Text style={styles.subtitle}>{displayWorkout.exercises.length} exercises</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>EXERCISES</Text>
        {displayWorkout.exercises.map((ex, i) => (
          <View key={i} style={styles.exerciseRow}>
            <View style={styles.exerciseNum}>
              <Text style={styles.exerciseNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              {(ex.reps ?? ex.duration) ? (
                <Text style={styles.exerciseMeta}>{ex.reps ?? ex.duration}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { alignItems: "center", gap: 12 }]}>
        <Text style={styles.sectionLabel}>ROUND TIMER</Text>
        <Text style={styles.timerDisplay}>
          {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
        </Text>
        <View style={styles.timerBtns}>
          <Pressable
            style={[styles.timerBtn, { backgroundColor: running ? C.coral : C.mint }]}
            onPress={() => setRunning((r) => !r)}
          >
            <Text style={styles.timerBtnText}>{running ? "Pause" : "Start"}</Text>
          </Pressable>
          <Pressable
            style={[styles.timerBtn, { backgroundColor: "rgba(12,12,12,0.08)" }]}
            onPress={() => { setRunning(false); setSeconds(TIMER_SECONDS); }}
          >
            <Text style={[styles.timerBtnText, { color: C.ink }]}>Reset</Text>
          </Pressable>
        </View>
      </View>

      {xpEarned !== null && (
        <View style={styles.xpBanner}>
          <Text style={styles.xpBannerText}>+{xpEarned} XP earned!</Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {xpEarned === null && (
        <Pressable
          style={[styles.completeBtn, completing && { opacity: 0.6 }]}
          onPress={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <Text style={styles.completeBtnText}>Complete Workout</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 14,
    paddingBottom: 40,
  },
  backBtn: { marginTop: 12, alignSelf: "flex-start" },
  backText: { fontSize: 14, color: "rgba(12,12,12,0.5)", fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "800", color: C.ink },
  subtitle: { fontSize: 14, color: "rgba(12,12,12,0.55)" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(12,12,12,0.4)",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(12,12,12,0.06)",
  },
  exerciseNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.mint,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseNumText: { fontSize: 12, fontWeight: "800", color: C.ink },
  exerciseName: { fontSize: 15, fontWeight: "600", color: C.ink },
  exerciseMeta: { fontSize: 12, color: "rgba(12,12,12,0.5)", marginTop: 1 },
  timerDisplay: { fontSize: 48, fontWeight: "800", color: C.ink, letterSpacing: 2 },
  timerBtns: { flexDirection: "row", gap: 10 },
  timerBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 90,
    alignItems: "center",
  },
  timerBtnText: { fontWeight: "700", fontSize: 14, color: C.ink },
  xpBanner: {
    backgroundColor: C.mint,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  xpBannerText: { fontSize: 18, fontWeight: "800", color: C.ink },
  errorText: { fontSize: 13, color: C.coral, fontWeight: "500" },
  completeBtn: {
    backgroundColor: C.mint,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  completeBtnText: { fontSize: 16, fontWeight: "800", color: C.ink },
});
