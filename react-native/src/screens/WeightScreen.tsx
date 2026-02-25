import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

interface WeightLogEntry {
  id: string;
  weight: number;
  logged_at: string;
}

interface LogWeightResponse {
  id: string;
  xp: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WeightScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [history, setHistory] = useState<WeightLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [weightInput, setWeightInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchHistory() {
    try {
      const res = await apiFetch<WeightLogEntry[]>("/weight/history");
      setHistory(res.slice(0, 5));
    } catch {
      // keep empty
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    void fetchHistory();
  }, []);

  async function handleLog() {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) {
      setError("Please enter a valid weight in kg.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<LogWeightResponse>("/weight/log", {
        method: "POST",
        body: JSON.stringify({ weight: w }),
      });
      setXpEarned(res.xp);
      setWeightInput("");
      await fetchHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log weight.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.cream }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Weight tracking</Text>
        <Text style={styles.subtitle}>Log your weight to track progress.</Text>

        {/* Log form */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>LOG TODAY'S WEIGHT</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="e.g. 74.5"
              placeholderTextColor="rgba(12,12,12,0.35)"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {xpEarned !== null && (
            <View style={styles.xpBanner}>
              <Text style={styles.xpBannerText}>+{xpEarned} XP earned!</Text>
            </View>
          )}

          <Pressable
            style={[styles.btn, submitting && { opacity: 0.6 }]}
            onPress={handleLog}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={C.ink} />
            ) : (
              <Text style={styles.btnText}>Save weight</Text>
            )}
          </Pressable>
        </View>

        {/* History */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>LAST 5 ENTRIES</Text>
          {loadingHistory ? (
            <ActivityIndicator color={C.mint} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Start logging!</Text>
          ) : (
            history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{formatDate(entry.logged_at)}</Text>
                <Text style={styles.historyWeight}>{entry.weight} kg</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(12,12,12,0.4)",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(12,12,12,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.cream,
  },
  unit: { fontSize: 15, fontWeight: "600", color: "rgba(12,12,12,0.5)" },
  errorText: { fontSize: 13, color: C.coral, fontWeight: "500" },
  xpBanner: {
    backgroundColor: C.mint,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  xpBannerText: { fontSize: 15, fontWeight: "800", color: C.ink },
  btn: {
    backgroundColor: C.midnight,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  btnText: { color: C.cream, fontWeight: "700", fontSize: 15 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(12,12,12,0.06)",
  },
  historyDate: { fontSize: 14, color: "rgba(12,12,12,0.55)" },
  historyWeight: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptyText: { fontSize: 14, color: "rgba(12,12,12,0.4)", textAlign: "center", paddingVertical: 8 },
});
