import React from "react";
import { View, Text } from "react-native";
import { baseStyles } from "../components/styles";

export function WeightScreen() {
  return (
    <View style={[baseStyles.screen, { gap: 16 }]}> 
      <Text style={baseStyles.title}>Weight tracking</Text>
      <View style={baseStyles.card}>
        <Text style={{ fontWeight: "600" }}>Last check-in</Text>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>74.6 kg</Text>
        <Text style={baseStyles.subtitle}>Down 0.8 kg this week</Text>
      </View>
    </View>
  );
}
