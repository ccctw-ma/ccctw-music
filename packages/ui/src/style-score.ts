export interface UiStyleSnapshot {
  features: {
    browse: boolean;
    search: boolean;
    library: boolean;
    queue: boolean;
    favorites: boolean;
    playlists: boolean;
    lyrics: boolean;
    player: boolean;
  };
  visual: {
    background: string;
    accentColors: string[];
    fontFamilies: string[];
    hasAtmosphere: boolean;
    hasGenericPurpleGradient: boolean;
  };
  composition: {
    cardCount: number;
    interactiveCount: number;
    hasAsymmetry: boolean;
    hasPersistentPlayer: boolean;
    hasMotion: boolean;
  };
  accessibility: {
    landmarkCount: number;
    namedButtonCount: number;
    focusableCount: number;
    hasVisibleFocus: boolean;
  };
  responsive: {
    viewportWidth: number;
    scrollWidth: number;
    hasMiniPlayer: boolean;
    hasMobileAdaptation: boolean;
  };
}

export interface UiStyleScore {
  total: number;
  categories: {
    features: number;
    visual: number;
    composition: number;
    accessibility: number;
    responsive: number;
  };
  passed: boolean;
  notes: string[];
}

const REQUIRED_FEATURES: Array<keyof UiStyleSnapshot["features"]> = [
  "browse",
  "search",
  "library",
  "queue",
  "favorites",
  "playlists",
  "lyrics",
  "player",
];

const GENERIC_FONTS = ["inter", "arial", "roboto", "system-ui"];

function clampScore(score: number, max: number) {
  return Math.max(0, Math.min(max, score));
}

function scoreFeatures(snapshot: UiStyleSnapshot, notes: string[]) {
  const present = REQUIRED_FEATURES.filter((feature) => snapshot.features[feature]);
  const missing = REQUIRED_FEATURES.filter((feature) => !snapshot.features[feature]);
  if (missing.length > 0) {
    notes.push(`Missing required first-version music features: ${missing.join(", ")}.`);
  }
  return clampScore((present.length / REQUIRED_FEATURES.length) * 25, 25);
}

function scoreVisual(snapshot: UiStyleSnapshot, notes: string[]) {
  const fonts = snapshot.visual.fontFamilies.map((font) => font.toLowerCase());
  const genericFontCount = fonts.filter((font) => GENERIC_FONTS.some((generic) => font.includes(generic))).length;
  const usesDistinctiveType = genericFontCount < fonts.length;
  const hasDarkAtmosphericBase =
    !snapshot.visual.background.includes("255, 255, 255") && !snapshot.visual.background.includes("255 255 255");
  const hasColorRange = snapshot.visual.accentColors.length >= 3;
  let score = 0;

  if (usesDistinctiveType) score += 7;
  if (hasDarkAtmosphericBase) score += 5;
  if (hasColorRange) score += 5;
  if (snapshot.visual.hasAtmosphere) score += 5;
  if (!snapshot.visual.hasGenericPurpleGradient) score += 3;

  if (score < 18) {
    notes.push("Visual direction is too generic for the required distinctive music product.");
  }

  return clampScore(score, 25);
}

function scoreComposition(snapshot: UiStyleSnapshot) {
  let score = 0;
  if (snapshot.composition.cardCount >= 10) score += 5;
  if (snapshot.composition.interactiveCount >= 16) score += 4;
  if (snapshot.composition.hasAsymmetry) score += 4;
  if (snapshot.composition.hasPersistentPlayer) score += 4;
  if (snapshot.composition.hasMotion) score += 3;
  return clampScore(score, 20);
}

function scoreAccessibility(snapshot: UiStyleSnapshot) {
  let score = 0;
  if (snapshot.accessibility.landmarkCount >= 6) score += 4;
  if (snapshot.accessibility.namedButtonCount >= 12) score += 4;
  if (snapshot.accessibility.focusableCount >= 16) score += 4;
  if (snapshot.accessibility.hasVisibleFocus) score += 3;
  return clampScore(score, 15);
}

function scoreResponsive(snapshot: UiStyleSnapshot, notes: string[]) {
  let score = 0;
  if (snapshot.responsive.scrollWidth <= snapshot.responsive.viewportWidth + 1) score += 5;
  if (snapshot.responsive.hasMiniPlayer) score += 5;
  if (snapshot.responsive.hasMobileAdaptation) score += 5;

  if (score < 15) {
    notes.push("Responsive behavior does not yet satisfy the mobile music-player requirement.");
  }

  return clampScore(score, 15);
}

export function scoreUiSnapshot(snapshot: UiStyleSnapshot): UiStyleScore {
  const notes: string[] = [];
  const categories = {
    features: scoreFeatures(snapshot, notes),
    visual: scoreVisual(snapshot, notes),
    composition: scoreComposition(snapshot),
    accessibility: scoreAccessibility(snapshot),
    responsive: scoreResponsive(snapshot, notes),
  };

  const totalBeforeCaps = Math.round(Object.values(categories).reduce((sum, value) => sum + value, 0));
  const missingFeatureCount = REQUIRED_FEATURES.filter((feature) => !snapshot.features[feature]).length;
  const genericVisualPenalty = snapshot.visual.hasGenericPurpleGradient ? 86 : 100;
  const featureCap = missingFeatureCount > 0 ? 90 - missingFeatureCount : 100;
  const total = Math.min(totalBeforeCaps, genericVisualPenalty, featureCap);
  const passed = total > 90;

  if (!passed && notes.length === 0) {
    notes.push("UI score must be greater than 90 to pass.");
  }

  return {
    total,
    categories,
    passed,
    notes,
  };
}
