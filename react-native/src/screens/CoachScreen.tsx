import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch, ApiError } from "../services/api";
import type { RootStackParamList } from "../../App";

const C = {
  mint: "#2EC4B6",
  coral: "#FF6B6B",
  sun: "#FFBF69",
  midnight: "#1A1B26",
  cream: "#F7F3EE",
  ink: "#0C0C0C",
};

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
}

interface CoachResponse {
  text: string;
}

export function CoachScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your PerfectShape AI coach. Ask me anything about your workouts, nutrition, or motivation!",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || sending) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: prompt };
    addMessage(userMsg);
    setInput("");
    setSending(true);

    try {
      const res = await apiFetch<CoachResponse>("/ai/coach", {
        method: "POST",
        body: JSON.stringify({ context: {}, prompt }),
      });
      addMessage({ id: (Date.now() + 1).toString(), role: "assistant", text: res.text });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "error",
          text: "You're out of credits. Purchase more to keep chatting with your coach!",
        });
      } else {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "error",
          text: "Something went wrong. Please try again.",
        });
      }
    } finally {
      setSending(false);
    }
  }

  function renderItem({ item }: { item: Message }) {
    const isUser = item.role === "user";
    const isError = item.role === "error";
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : isError ? styles.bubbleError : styles.bubbleAI]}>
        {!isUser && (
          <Text style={styles.roleLabel}>{isError ? "NOTICE" : "COACH"}</Text>
        )}
        <Text style={[styles.bubbleText, isUser && { color: C.cream }]}>{item.text}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>AI Coach</Text>
        <View style={styles.onlineDot} />
      </View>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing indicator */}
      {sending && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={C.mint} />
          <Text style={styles.typingText}>Coach is thinking...</Text>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your coach..."
          placeholderTextColor="rgba(12,12,12,0.35)"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: "#fff",
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  backText: { fontSize: 14, color: "rgba(12,12,12,0.5)", fontWeight: "600", marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: C.ink },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.mint },
  messageList: { padding: 16, gap: 10, paddingBottom: 8 },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: 12,
    marginVertical: 4,
    gap: 3,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: C.midnight,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleError: {
    alignSelf: "center",
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: C.coral,
    borderRadius: 12,
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: C.mint,
    textTransform: "uppercase",
  },
  bubbleText: { fontSize: 14, color: C.ink, lineHeight: 20 },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  typingText: { fontSize: 13, color: "rgba(12,12,12,0.45)", fontStyle: "italic" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(12,12,12,0.08)",
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(12,12,12,0.12)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.cream,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: C.mint,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendBtnText: { fontWeight: "800", fontSize: 14, color: C.ink },
});
