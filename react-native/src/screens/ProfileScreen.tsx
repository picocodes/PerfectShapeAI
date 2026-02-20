import React from "react";
import { View, Text } from "react-native";
import { baseStyles } from "../components/styles";

export function ProfileScreen() {
  return (
    <View style={[baseStyles.screen, { gap: 16 }]}> 
      <Text style={baseStyles.title}>Profile</Text>
      <View style={[baseStyles.card, { gap: 8 }]}> 
        <Text style={{ fontWeight: "600" }}>Goal</Text>
        <Text style={baseStyles.subtitle}>Target weight: 68 kg</Text>
        <Text style={baseStyles.subtitle}>Activity: Moderate</Text>
        <Text style={baseStyles.subtitle}>Plan: Monthly 100 credits</Text>
      </View>
    </View>
  );
}
