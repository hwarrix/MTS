import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PendingBannerProps {
  status?: string;
}

export function PendingBanner({ status }: PendingBannerProps) {
  const insets = useSafeAreaInsets();

  if (status === 'approved') return null;

  let message = 'Your account is pending verification. You cannot manage appointments until approved.';
  let bgColor = Colors.warning;

  if (status === 'rejected') {
    message = 'Your application was rejected. Please contact administration.';
    bgColor = Colors.danger;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgColor }]}>
      <View style={styles.banner}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 90,
  },
  banner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Typography.bodySmall,
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
});
