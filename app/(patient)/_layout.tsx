import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

export default function PatientLayout() {
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
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: {
          ...Typography.bodySmall,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          // Note: Add icons later (e.g. from @expo/vector-icons)
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
