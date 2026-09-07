import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing, Shadow } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    let baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.full,
      opacity: isDisabled ? 0.6 : 1,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    };

    switch (size) {
      case 'sm':
        baseStyle = { ...baseStyle, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md };
        break;
      case 'md':
        baseStyle = { ...baseStyle, paddingVertical: 12, paddingHorizontal: Spacing.lg };
        break;
      case 'lg':
        baseStyle = { ...baseStyle, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl };
        break;
    }

    if (isOutline) {
      baseStyle = {
        ...baseStyle,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'transparent',
      };
    } else if (isGhost) {
      baseStyle = {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    } else if (isSecondary) {
      baseStyle = {
        ...baseStyle,
        backgroundColor: Colors.bg3,
      };
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    let baseStyle: TextStyle = {
      ...Typography.buttonMedium,
      color: Colors.text1,
      textAlign: 'center',
    };

    if (size === 'lg') baseStyle = { ...baseStyle, ...Typography.buttonLarge };
    if (size === 'sm') baseStyle = { ...baseStyle, fontSize: 13 };

    if (isOutline || isGhost) {
      baseStyle.color = Colors.primary;
    } else if (isDanger) {
      baseStyle.color = Colors.text1;
    }

    return baseStyle;
  };

  const content = (
    <React.Fragment>
      {loading ? (
        <ActivityIndicator color={isOutline || isGhost ? Colors.primary : Colors.text1} size="small" style={{ marginRight: Spacing.sm }} />
      ) : (
        leftIcon && <React.Fragment>{leftIcon}</React.Fragment>
      )}
      <Text style={[getTextStyle(), leftIcon && !loading ? { marginLeft: Spacing.sm } : {}, rightIcon ? { marginRight: Spacing.sm } : {}]}>
        {title}
      </Text>
      {rightIcon && !loading && <React.Fragment>{rightIcon}</React.Fragment>}
    </React.Fragment>
  );

  if (isPrimary || isDanger) {
    const gradientColors = isDanger ? Colors.gradientDanger : Colors.gradientPrimary;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isDisabled}
        style={[styles.shadow, fullWidth && { alignSelf: 'stretch' }, style]}
        {...props}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={getContainerStyle()}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[getContainerStyle(), style]}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: Shadow.md,
});
