import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { baseStyles } from "../components/styles";
import type { RootStackParamList } from "../../App";

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[baseStyles.screen, { gap: 18 }]}> 
      <View>
        <View style={baseStyles.pill}>
          <Text style={baseStyles.pillText}>PerfectShape AI</Text>
        </View>
        <Text style={baseStyles.title}>Start your 10-minute win streak.</Text>
        <Text style={baseStyles.subtitle}>
          Tell us your goals and we will build your first home plan for free.
        </Text>
      </View>

      <View style={[baseStyles.card, { gap: 8 }]}> 
        <Text style={{ fontWeight: "600" }}>Onboarding checklist</Text>
        <Text style={baseStyles.subtitle}>Age, weight, target, activity, and gear.</Text>
        <Text style={baseStyles.subtitle}>Diet preference and workout time.</Text>
      </View>

      <Pressable
        style={{
          marginTop: "auto",
          backgroundColor: "#2EC4B6",
          paddingVertical: 14,
          borderRadius: 999,
          alignItems: "center"
        }}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={{ fontWeight: "700", color: "#0C0C0C" }}>Continue</Text>
      </Pressable>
    </View>
  );
}
