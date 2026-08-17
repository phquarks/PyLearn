/**
 * Deep Current, the app's colour system.
 *
 * React Native has no cascade, so what were CSS custom properties on the web
 * build become a plain object every component reads from.
 *
 * Blue leads. It is not an arbitrary pick: the wordmark already carries a navy,
 * so the chrome now agrees with the logo instead of competing with it. Amber
 * stays on XP, coins and streaks, where it reads as reward and sits opposite
 * blue on the wheel. Orange is the third accent, used for selection.
 *
 * Green did not simply disappear — it moved. It used to be both the brand and
 * the "you got it right" signal, which meant recolouring the brand would have
 * quietly repainted every correct answer. Those are now separate: `success`
 * below owns correctness and stays green, because no other hue says it as fast.
 */

export const color = {
  surface: '#f7f9fc',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f0f4f9',
  surfaceContainer: '#e9eef5',
  surfaceHigh: '#e2e9f1',
  surfaceHighest: '#dae3ed',
  surfaceDim: '#cfd9e6',

  onSurface: '#131a21',
  onSurfaceVariant: '#3b4754',
  // one step darker than it looks like it needs to be: this is what placeholder
  // text is drawn in, and the lighter value landed at 4.3:1 against the page
  outline: '#647180',
  outlineVariant: '#b4c3d3',

  primary: '#0d5490',
  onPrimary: '#ffffff',
  // deep enough that white body text clears 4.5:1 on it, which the old green
  // fill never did — it sat near 1.8:1 and had to be read rather than seen
  primaryContainer: '#1478c8',
  onPrimaryContainer: '#0a4275',
  primaryEdge: '#0f5c9c',
  /** tinted fills that pair with a primaryContainer border */
  primaryWash: '#e4f1fd',
  primaryWashSoft: '#f1f7fe',

  secondaryContainer: '#fec700',
  onSecondaryContainer: '#6e5400',
  secondaryFixed: '#ffdf92',
  onSecondaryFixed: '#241a00',
  secondaryEdge: '#d9a000',

  tertiary: '#a8461a',
  tertiaryContainer: '#ff8a3d',
  tertiaryFixed: '#ffe1cd',
  // dark enough to carry body text directly on the orange fill, which a unit
  // card does; the lighter value only cleared 3.4:1 there
  onTertiaryContainer: '#642600',
  tertiaryEdge: '#d96a1e',
  tertiaryWash: '#fff1e7',

  /** correctness, kept green on purpose — see the note above */
  success: '#2f8a04',
  successContainer: '#58cc02',
  onSuccessContainer: '#1e5000',
  successEdge: '#46a302',
  successWash: '#eefce4',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  lockedEdge: '#bcc4cf',
  streak: '#b07d00',
  price: '#a07800',

  /**
   * The glass pill: a wash over blurred content, plus its opaque fallback.
   *
   * Both washes sit a few steps below `surface` rather than matching it. Tinting
   * the glass the same near-white as the page left the pill invisible wherever
   * the screen behind it was empty, since blur has nothing to work with there.
   * The hairline is dark for the same reason — a white edge on a white page is
   * no edge at all.
   */
  navGlass: 'rgba(225, 232, 241, 0.72)',
  navGlassSolid: 'rgba(229, 236, 244, 0.97)',
  navHairline: 'rgba(10, 42, 74, 0.12)',
  navTabWash: 'rgba(20, 120, 200, 0.18)',
  navTabWashEdge: 'rgba(20, 120, 200, 0.34)',
  navTabHover: 'rgba(19, 26, 33, 0.06)',
  /** the pill's drop shadow, a darkened cast of the primary rather than black */
  navShadow: '#0a2a45',
} as const;

export const font = {
  display: 'PlusJakartaSans_800ExtraBold',
  displaySemi: 'PlusJakartaSans_700Bold',
  body: 'BeVietnamPro_500Medium',
  bodyBold: 'BeVietnamPro_700Bold',
  /** every string of Python renders monospaced */
  mono: 'Menlo',
} as const;

export const radius = {
  sm: 8,
  base: 16,
  lg: 32,
  tab: 24,
  nav: 30,
  pill: 999,
} as const;

export const space = {
  base: 4,
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  gutter: 16,
  screen: 20,
} as const;

/**
 * Isometric depth. The web draws these as zero-blur box-shadows; React Native
 * has no such shadow, so the same silhouette is built from a bottom border on
 * the resting state and removed as the object sinks on press.
 */
export const edge = {
  stone: 6,
  button: 4,
  card: 4,
  buy: 3,
  tile: 2,
} as const;

/** the path: stones and the ribbon are generated from this one table */
export const path = {
  width: 320,
  top: 48,
  step: 128,
  swing: [0, 58, 0, -58],
  stone: 76,
  goal: 88,
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 26, lineHeight: 32 },
  title: { fontFamily: font.display, fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: font.displaySemi, fontSize: 19, lineHeight: 26 },
  section: { fontFamily: font.display, fontSize: 17, lineHeight: 24 },
  prompt: { fontFamily: font.display, fontSize: 21, lineHeight: 28 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: font.bodyBold, fontSize: 14, lineHeight: 18 },
  labelSm: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 16 },
  tab: { fontFamily: font.bodyBold, fontSize: 11, lineHeight: 14 },
  code: { fontFamily: font.mono, fontSize: 15, lineHeight: 22 },
} as const;
