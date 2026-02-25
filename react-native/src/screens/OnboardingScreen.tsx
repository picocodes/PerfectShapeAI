import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

type Gender = "Male" | "Female" | "Other";
type ActivityLevel = "Sedentary" | "Light" | "Moderate" | "Active";
type DietPref = "None" | "Vegan" | "Vegetarian" | "Keto" | "Budget";
type WorkoutTime = 15 | 30 | 45;

const TOTAL_STEPS = 3;

function OptionBtn<T extends string | number>({
  value, selected, onPress,
}: { value: T; selected: boolean; onPress: (v: T) => void }) {
  return (
    <Pressable
      style={[styles.optionBtn, selected && styles.optionBtnActive]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.optionBtnText, selected && styles.optionBtnTextActive]}>
        {String(value)}
      </Text>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUser } = useAppStore();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);

  // Step 2
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  // Step 3
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [dietPref, setDietPref] = useState<DietPref>("None");
  const [workoutTime, setWorkoutTime] = useState<WorkoutTime | null>(null);

  function validateStep(): string | null {
    if (step === 1) {
      if (!name.trim()) return "Please enter your name.";
      if (!age.trim() || isNaN(Number(age)) || Number(age) < 10) return "Please enter a valid age.";
      if (!gender) return "Please select your gender.";
    } else if (step === 2) {
      if (!height.trim() || isNaN(Number(height))) return "Please enter your height in cm.";
      if (!currentWeight.trim() || isNaN(Number(currentWeight))) return "Please enter your current weight.";
      if (!targetWeight.trim() || isNaN(Number(targetWeight))) return "Please enter your target weight.";
    } else if (step === 3) {
      if (!activityLevel) return "Please select your activity level.";
      if (!workoutTime) return "Please select your workout time.";
    }
    return null;
  }

  function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  }

  async function handleFinish() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        age: Number(age),
        gender,
        height: Number(height),
        current_weight: Number(currentWeight),
        target_weight: Number(targetWeight),
        activity_level: activityLevel?.toLowerCase(),
        dietary_preference: dietPref.toLowerCase(),
        workout_time: workoutTime,
      };
      const updated = await apiFetch<Record<string, unknown>>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser(updated as Parameters<typeof setUser>[0]);
      navigation.replace("Home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.cream }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}
            />
          ))}
          <Text style={styles.progressText}>Step {step} of {TOTAL_STEPS}</Text>
        </View>

        {/* Step 1 */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>GETTING STARTED</Text>
            </View>
            <Text style={styles.title}>Tell us about{"\n"}yourself</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex"
                placeholderTextColor="rgba(12,12,12,0.35)"
                returnKeyType="next"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 28"
                placeholderTextColor="rgba(12,12,12,0.35)"
                keyboardType="number-pad"
                returnKeyType="done"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Gender</Text>
              <View style={styles.optionRow}>
                {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                  <OptionBtn key={g} value={g} selected={gender === g} onPress={setGender} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>YOUR BODY</Text>
            </View>
            <Text style={styles.title}>Your current{"\n"}measurements</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 172"
                placeholderTextColor="rgba(12,12,12,0.35)"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Current weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={currentWeight}
                onChangeText={setCurrentWeight}
                placeholder="e.g. 78.0"
                placeholderTextColor="rgba(12,12,12,0.35)"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Target weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={targetWeight}
                onChangeText={setTargetWeight}
                placeholder="e.g. 68.0"
                placeholderTextColor="rgba(12,12,12,0.35)"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>YOUR LIFESTYLE</Text>
            </View>
            <Text style={styles.title}>How active{"\n"}are you?</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Activity level</Text>
              <View style={styles.optionGrid}>
                {(["Sedentary", "Light", "Moderate", "Active"] as ActivityLevel[]).map((a) => (
                  <OptionBtn key={a} value={a} selected={activityLevel === a} onPress={setActivityLevel} />
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Dietary preference</Text>
              <View style={styles.optionGrid}>
                {(["None", "Vegan", "Vegetarian", "Keto", "Budget"] as DietPref[]).map((d) => (
                  <OptionBtn key={d} value={d} selected={dietPref === d} onPress={setDietPref} />
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Daily workout time</Text>
              <View style={styles.optionRow}>
                {([15, 30, 45] as WorkoutTime[]).map((t) => (
                  <OptionBtn key={t} value={t} selected={workoutTime === t} onPress={setWorkoutTime} />
                ))}
              </View>
            </View>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Nav buttons */}
        <View style={styles.navBtns}>
          {step > 1 && (
            <Pressable style={styles.btnBack} onPress={() => { setError(null); setStep((s) => s - 1); }}>
              <Text style={styles.btnBackText}>Back</Text>
            </Pressable>
          )}
          {step < TOTAL_STEPS ? (
            <Pressable style={[styles.btnNext, { flex: 1 }]} onPress={handleNext}>
              <Text style={styles.btnNextText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.btnNext, { flex: 1 }, saving && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <Text style={styles.btnNextText}>Build my plan!</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 48,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(12,12,12,0.15)",
  },
  progressDotActive: { backgroundColor: C.mint },
  progressText: { fontSize: 12, color: "rgba(12,12,12,0.45)", marginLeft: 6 },
  stepContainer: { gap: 12 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: C.midnight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    color: C.cream,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontSize: 30, fontWeight: "800", color: C.ink, lineHeight: 36 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(12,12,12,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
    backgroundColor: C.cream,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(12,12,12,0.15)",
    backgroundColor: C.cream,
  },
  optionBtnActive: { backgroundColor: C.midnight, borderColor: C.midnight },
  optionBtnText: { fontSize: 13, fontWeight: "600", color: C.ink },
  optionBtnTextActive: { color: C.cream },
  errorText: { fontSize: 13, color: C.coral, fontWeight: "500" },
  navBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnBack: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "rgba(12,12,12,0.08)",
    alignItems: "center",
  },
  btnBackText: { fontWeight: "700", fontSize: 15, color: C.ink },
  btnNext: {
    backgroundColor: C.mint,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  btnNextText: { fontWeight: "800", fontSize: 15, color: C.ink },
});
