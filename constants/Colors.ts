export const Colors = {
  // Brand palette — deep navy + electric blue + teal accent
  primary: '#4F87FF',
  primaryDark: '#2D5FD6',
  primaryLight: '#7AAEFF',

  accent: '#00C9A7',
  accentDark: '#00A088',

  warning: '#FFB547',
  danger: '#FF5A65',
  dangerDark: '#D93F49',
  success: '#22C55E',

  // Dark theme backgrounds
  bg0: '#070E1A',    // deepest background
  bg1: '#0A1628',    // screen background
  bg2: '#0F1E35',    // card background
  bg3: '#162540',    // elevated surface
  bg4: '#1C2E4E',    // highest elevation

  // Text hierarchy
  text1: '#F0F4FF',   // primary text
  text2: '#9AAAC8',   // secondary text
  text3: '#5C6F8F',   // muted / disabled text

  // Borders
  border1: '#1E2E4A',
  border2: '#263654',

  // Gradient pairs
  gradientPrimary: ['#4F87FF', '#7A3FFF'] as const,
  gradientAccent: ['#00C9A7', '#4F87FF'] as const,
  gradientDanger: ['#FF5A65', '#FF8C42'] as const,
  gradientCard: ['#0F1E35', '#162540'] as const,

  // Status badge colors
  status: {
    scheduled:  { bg: '#1A2F4E', text: '#4F87FF' },
    completed:  { bg: '#0D2E1F', text: '#22C55E' },
    cancelled:  { bg: '#2E1218', text: '#FF5A65' },
    rescheduled:{ bg: '#2E2510', text: '#FFB547' },
    pending:    { bg: '#2B2010', text: '#FFB547' },
    approved:   { bg: '#0D2E1F', text: '#22C55E' },
    rejected:   { bg: '#2E1218', text: '#FF5A65' },
    paid:       { bg: '#0D2E1F', text: '#22C55E' },
    failed:     { bg: '#2E1218', text: '#FF5A65' },
    waived:     { bg: '#1A1A2E', text: '#9AAAC8' },
  },

  // Specialty department icon colors
  department: {
    Cardiology: '#FF5A65',
    Pediatrics: '#4F87FF',
    Neurology: '#A855F7',
    Orthopedics: '#22C55E',
    Oncology: '#FF8C42',
    Dermatology: '#EC4899',
    Radiology: '#00C9A7',
    Emergency: '#FFB547',
    General: '#9AAAC8',
  } as Record<string, string>,
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
}

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#4F87FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#4F87FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
}
