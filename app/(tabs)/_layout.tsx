import React from "react";
import { Tabs } from "expo-router";
import { TabBar } from "@/components/ui";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />} backBehavior="history">
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="me" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="records" />
    </Tabs>
  );
}
