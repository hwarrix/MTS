import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { useWindowDimensions, StyleSheet, View, Text } from 'react-native';

export default function ManagerLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg1,
          borderTopColor: Colors.border1,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: isTablet ? 80 : 60,
          paddingBottom: isTablet ? 20 : 10,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: {
          ...Typography.bodySmall,
          fontWeight: '500',
          fontSize: isTablet ? 14 : 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: 'Verifications',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedules',
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Financials',
        }}
      />
      <Tabs.Screen
        name="insurance"
        options={{
          title: 'Insurance',
        }}
      />
    </Tabs>
  );
}
