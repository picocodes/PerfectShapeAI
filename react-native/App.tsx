import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "react-native";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { WorkoutScreen } from "./src/screens/WorkoutScreen";
import { WeightScreen } from "./src/screens/WeightScreen";
import { CoachScreen } from "./src/screens/CoachScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Workout: undefined;
  Weight: undefined;
  Coach: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Workout" component={WorkoutScreen} />
        <Stack.Screen name="Weight" component={WeightScreen} />
        <Stack.Screen name="Coach" component={CoachScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
