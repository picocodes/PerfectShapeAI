import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getFirebaseAuth } from "../services/firebase";
import type { RootStackParamList } from "../../App";

const C = {
  mint: "#2EC4B6",
  coral: "#FF6B6B",
  sun: "#FFBF69",
  midnight: "#1A1B26",
  cream: "#F7F3EE",
  ink: "#0C0C0C",
};

function friendlyError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email doesn't look right.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      navigation.replace("Home");
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      navigation.replace("Onboarding");
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>PERFECTSHAPE AI</Text>
          </View>
          <Text style={styles.title}>Your best shape{"\n"}starts today.</Text>
          <Text style={styles.subtitle}>Sign in or create your free account.</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(12,12,12,0.35)"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="rgba(12,12,12,0.35)"
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.cream} />
            ) : (
              <Text style={styles.btnPrimaryText}>Log in</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.btnSecondary, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.btnSecondaryText}>Create account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.cream },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    justifyContent: "center",
  },
  header: { gap: 10 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: C.midnight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  pillText: {
    color: C.cream,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: C.ink,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(12,12,12,0.55)",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.ink,
    marginBottom: 6,
  },
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
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: C.coral,
    fontWeight: "500",
  },
  btnPrimary: {
    marginTop: 20,
    backgroundColor: C.midnight,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: C.cream,
    fontWeight: "700",
    fontSize: 15,
  },
  btnSecondary: {
    marginTop: 10,
    backgroundColor: C.mint,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: C.ink,
    fontWeight: "700",
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.6 },
});
