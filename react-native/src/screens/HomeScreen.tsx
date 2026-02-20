import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { baseStyles } from "../components/styles";
import type { RootStackParamList } from "../../App";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[baseStyles.screen, { gap: 16 }]}> 
      <Text style={baseStyles.title}>Today's plan</Text>
      <View style={[baseStyles.card, { gap: 6 }]}> 
        <Text style={{ fontSize: 18, fontWeight: "600" }}>15-min Core Ignition</Text>
        <Text style={baseStyles.subtitle}>Target: -320 kcal</Text>
        <Pressable
          style={{
            marginTop: 12,
            backgroundColor: "#1A1B26",
            paddingVertical: 10,
            borderRadius: 999,
            alignItems: "center"
          }}
          onPress={() => navigation.navigate("Workout")}
        >
          <Text style={{ color: "#F7F3EE", fontWeight: "600" }}>Start workout</Text>
        </Pressable>
      </View>

      <View style={[baseStyles.card, { gap: 6 }]}> 
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Streak</Text>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>4 days</Text>
        <Text style={baseStyles.subtitle}>Keep it alive with a quick walk.</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: "#FFBF69", padding: 12, borderRadius: 16 }}
          onPress={() => navigation.navigate("Coach")}
        >
          <Text style={{ fontWeight: "700" }}>AI Coach</Text>
          <Text style={baseStyles.subtitle}>Quick check-in</Text>
        </Pressable>
        <Pressable
          style={{ flex: 1, backgroundColor: "#FF6B6B", padding: 12, borderRadius: 16 }}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text style={{ fontWeight: "700" }}>Profile</Text>
          <Text style={baseStyles.subtitle}>Goals + plan</Text>
        </Pressable>
      </View>
    </View>
  );
}
