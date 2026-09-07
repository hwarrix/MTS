import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 14, 26, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    backgroundColor: Colors.bg2,
    padding: Spacing.xl,
    borderRadius: Spacing.md,
    alignItems: 'center',
  },
  message: {
    ...Typography.bodyMedium,
    color: Colors.text1,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
