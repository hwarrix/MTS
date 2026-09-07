import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/constants/Colors';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outline' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
  ...props
}: CardProps) {
  const isElevated = variant === 'elevated';
  const isOutline = variant === 'outline';

  return (
    <View
      style={[
        styles.base,
        isElevated && styles.elevated,
        isOutline && styles.outline,
        padding === 'sm' && { padding: Spacing.sm },
        padding === 'md' && { padding: Spacing.md },
        padding === 'lg' && { padding: Spacing.lg },
        padding === 'none' && { padding: 0 },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export interface PressableCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outline' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function PressableCard({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
  ...props
}: PressableCardProps) {
  const isElevated = variant === 'elevated';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.base,
        isElevated && styles.elevated,
        isOutline && styles.outline,
        padding === 'sm' && { padding: Spacing.sm },
        padding === 'md' && { padding: Spacing.md },
        padding === 'lg' && { padding: Spacing.lg },
        padding === 'none' && { padding: 0 },
        style,
      ]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
  },
  elevated: {
    ...Shadow.sm,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.border1,
    backgroundColor: 'transparent',
  },
});
