import { Platform } from 'react-native';

const FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  h1: {
    fontFamily: FONT_FAMILY,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  buttonLarge: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  buttonMedium: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};
