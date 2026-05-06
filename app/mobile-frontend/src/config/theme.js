// ─── Bonus Life AI — Clinical Calm Design System ──────────────────────────────

export const COLORS = {
  // Backgrounds
  bg:         '#F7F4ED',
  bgCard:     '#FFFFFF',
  bgElevated: '#EFECE4',
  bgDrawer:   '#F7F4ED',
  bgInput:    '#FFFFFF',
  bgDeep:     '#EFECE4',
  bgCardHigh: '#FFFFFF',
  bgNav:      '#F7F4ED',

  // Text
  textPrimary:   '#1C1B18',
  textSecondary: 'rgba(28,27,24,0.5)',
  textMuted:     'rgba(28,27,24,0.35)',
  textDim:       'rgba(28,27,24,0.2)',

  // Borders
  borderSubtle:  'rgba(28,27,24,0.08)',
  borderMedium:  'rgba(28,27,24,0.1)',
  border:        'rgba(28,27,24,0.08)',
  borderLight:   'rgba(28,27,24,0.05)',
  borderShimmer: 'rgba(28,27,24,0.12)',

  // Accents — Clinical Calm palette
  purple:  '#2D6A4F',   // sage green (primary accent)
  purpleDk:'#245A42',
  pink:    '#C85A3A',   // terracotta
  pinkDk:  '#B24E32',
  magenta: '#6B8794',   // slate blue
  cyan:    '#A7896C',   // warm tan
  orange:  '#B4781E',   // amber
  green:   '#3C7850',   // deep green
  blue:    '#6B8794',   // slate
  red:     '#C85A3A',   // terracotta (danger)
  amber:   '#B4781E',
  indigo:  '#6B8794',

  // Legacy aliases (backward-compat)
  violet:      '#2D6A4F',
  violetLight: '#52B788',
  violetGlow:  'rgba(45,106,79,0.25)',
  violetGlow2: 'rgba(45,106,79,0.1)',
  accent:      '#3C7850',
  accentLight: '#52B788',
  accentGlow:  'rgba(60,120,80,0.2)',
  accentGlow2: 'rgba(60,120,80,0.08)',
  cyanGlow:    'rgba(107,135,148,0.15)',
  blueGlow:    'rgba(107,135,148,0.15)',
};

// Feature color map — consistent across all screens
export const FEATURE_COLORS = {
  Assessment:     '#2D6A4F',   // sage green
  Heart:          '#C85A3A',   // terracotta
  BrainMRI:       '#6B8794',   // slate blue
  CKD:            '#A7896C',   // warm tan
  SymptomChecker: '#B4781E',   // amber
  LocalAI:        '#6B8794',   // slate
  DietPlan:       '#2D6A4F',   // sage
  MealPhoto:      '#C85A3A',   // terracotta
  WorkoutVideos:  '#6B8794',   // slate
  Hospitals:      '#C85A3A',   // terracotta
  ChatTab:        '#3C7850',   // deep green
  Dashboard:      '#2D6A4F',   // sage
};

export const GRADIENTS = {
  bg:      ['#F7F4ED', '#EFECE4'],
  primary: ['#2D6A4F', '#3C7850'],
  health:  ['#2D6A4F', '#3C7850'],
  card:    ['rgba(28,27,24,0.03)', 'rgba(28,27,24,0.01)'],
  hero:    ['rgba(45,106,79,0.12)', 'rgba(45,106,79,0.04)', 'rgba(247,244,237,0)'],
};

export const RADIUS = {
  xs:   8,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

export const FONT = {
  // sizes
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   20,
  xxl:  24,
  h1:   28,
  h0:   36,
  // weights
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '800',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  section: 32,
};

// Easing for spring-feel animations
export const EASING_SPRING = { damping: 20, stiffness: 90 };
