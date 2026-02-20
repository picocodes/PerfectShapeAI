import React from "react";
import { View, Text, Pressable } from "react-native";
import { baseStyles } from "../components/styles";

export function CoachScreen() {
  return (
    <View style={[baseStyles.screen, { gap: 16 }]}> 
      <Text style={baseStyles.title}>AI Coach</Text>
      <View style={[baseStyles.card, { gap: 8 }]}> 
        <Text style={baseStyles.subtitle}>
          You crushed three workouts this week. Want a 10-minute recovery flow on Saturday?
        </Text>
      </View>
      <Pressable
        style={{
          backgroundColor: "#1A1B26",
          paddingVertical: 12,
          borderRadius: 999,
          alignItems: "center"
        }}
      >
        <Text style={{ color: "#F7F3EE", fontWeight: "600" }}>Open chat</Text>
      </Pressable>
    </View>
  );
}
