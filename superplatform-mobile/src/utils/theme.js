import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../lib/constants';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Shared stylesheet ────────────────────────────────────────────────────────
export const theme = StyleSheet.create({
  // Screens
  screen: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },

  // Cards
  card: {
    backgroundColor: COLORS.dark3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardPad: {
    padding: 16,
  },

  // Typography
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  muted: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  // Buttons
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: COLORS.brand,
  },
  btnSecondary: {
    backgroundColor: COLORS.dark4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnDanger: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  btnSm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },

  // Inputs
  input: {
    backgroundColor: COLORS.dark4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  inputFocused: {
    borderColor: COLORS.brand,
  },

  // Row/Col layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  // Badge
  badge: {
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Container padding
  px: { paddingHorizontal: 16 },
  py: { paddingVertical: 16 },
  p:  { padding: 16 },
  mt: { marginTop: 16 },
  mb: { marginBottom: 16 },
});

// ─── Helper to merge styles ────────────────────────────────────────────────────
export const s = (...styles) => styles.filter(Boolean).flat();
