import React from "react";
import { View, Text, Pressable } from "react-native";
import { baseStyles } from "../components/styles";

export function WorkoutScreen() {
  return (
    <View style={[baseStyles.screen, { gap: 16 }]}> 
      <Text style={baseStyles.title}>Core Ignition</Text>
      <Text style={baseStyles.subtitle}>3 rounds · 15 minutes</Text>

      <View style={[baseStyles.card, { gap: 6 }]}> 
        <Text style={{ fontWeight: "600" }}>Exercise list</Text>
        <Text style={baseStyles.subtitle}>1. Mountain climbers</Text>
        <Text style={baseStyles.subtitle}>2. Plank hold</Text>
        <Text style={baseStyles.subtitle}>3. Squat pulse</Text>
      </View>

      <Pressable
        style={{
          marginTop: "auto",
          backgroundColor: "#2EC4B6",
          paddingVertical: 14,
          borderRadius: 999,
          alignItems: "center"
        }}
      >
        <Text style={{ fontWeight: "700" }}>Complete workout</Text>
      </Pressable>
    </View>
  );
}
