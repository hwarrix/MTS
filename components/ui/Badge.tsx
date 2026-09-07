import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { Colors, Radius } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

export interface BadgeProps extends ViewProps {
  text: string;
  status?: keyof typeof Colors.status;
  size?: 'sm' | 'md';
}

export function Badge({
  text,
  status = 'pending',
  size = 'sm',
  style,
  ...props
}: BadgeProps) {
  const colors = Colors.status[status] || Colors.status.pending;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
        size === 'md' && styles.containerMd,
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          size === 'md' && styles.textMd,
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerMd: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textMd: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});
