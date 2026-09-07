import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

export interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ url, name, size = 48, style }: AvatarProps) {
  const getInitials = (nameStr: string) => {
    const parts = nameStr.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.container, containerStyle, style]}
      />
    );
  }

  return (
    <View style={[styles.container, styles.placeholder, containerStyle, style]}>
      <Text
        style={[
          styles.text,
          { fontSize: size * 0.4 },
        ]}
      >
        {name ? getInitials(name) : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: Colors.primaryDark,
  },
  text: {
    ...Typography.h3,
    color: Colors.text1,
  },
});
