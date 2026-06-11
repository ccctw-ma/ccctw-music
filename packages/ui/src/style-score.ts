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
const SKY_BLUE_TARGETS: RgbColor[] = [
  { red: 2, green: 132, blue: 199 },
  { red: 14, green: 165, blue: 233 },
  { red: 56, green: 189, blue: 248 },
  { red: 125, green: 211, blue: 252 },
];
const LIGHT_SKY_TARGETS: RgbColor[] = [
  { red: 240, green: 249, blue: 255 },
  { red: 224, green: 242, blue: 254 },
  { red: 186, green: 230, blue: 253 },
];

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

function firstFontFamily(fontFamily = "") {
  return fontFamily
    .split(",")
    .map((font) => font.trim().replace(/^['\"]|['\"]$/g, ""))
    .find(Boolean)
    ?.toLowerCase();
}

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

function rgbTriplet(color: string): RgbColor | undefined {
  const match = color.match(/rgba?\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)/i);
  if (!match) return undefined;

  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
  };
}

function matchesRgb(color: string, targets: RgbColor[]) {
  const rgb = rgbTriplet(color);
  return Boolean(
    rgb && targets.some((target) => rgb.red === target.red && rgb.green === target.green && rgb.blue === target.blue),
  );
}

function hueFromRgb({ red, green, blue }: RgbColor) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return undefined;
  if (max === r) return ((g - b) / delta + (g < b ? 6 : 0)) * 60;
  if (max === g) return ((b - r) / delta + 2) * 60;
  return ((r - g) / delta + 4) * 60;
}

function hueDistance(a: number, b: number) {
  const linearDistance = Math.abs(a - b);
  return Math.min(linearDistance, 360 - linearDistance);
}

function hasHueSeparation(colors: string[]) {
  const hues = colors.flatMap((color) => {
    const rgb = rgbTriplet(color);
    if (!rgb) return [];

    const hue = hueFromRgb(rgb);
    return hue === undefined ? [] : [hue];
  });

  for (let index = 0; index < hues.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < hues.length; otherIndex += 1) {
      if (hueDistance(hues[index], hues[otherIndex]) >= 36) return true;
    }
  }

  return false;
}

function scoreVisual(snapshot: UiStyleSnapshot, notes: string[]) {
  const primaryFonts = snapshot.visual.fontFamilies.flatMap((font) => {
    const first = firstFontFamily(font);
    return first ? [first] : [];
  });
  const usesDistinctiveType = primaryFonts.some((font) => !GENERIC_FONTS.some((generic) => font.includes(generic)));
  const hasSkyBlueIdentity = snapshot.visual.accentColors.some((color) => matchesRgb(color, SKY_BLUE_TARGETS));
  const hasLightSkyBase = matchesRgb(snapshot.visual.background, LIGHT_SKY_TARGETS);
  const hasColorRange = snapshot.visual.accentColors.length >= 4 && hasHueSeparation(snapshot.visual.accentColors);
  let score = 0;

  if (usesDistinctiveType) score += 6;
  if (hasSkyBlueIdentity) score += 7;
  if (hasLightSkyBase) score += 4;
  if (hasColorRange) score += 4;
  if (snapshot.visual.hasAtmosphere) score += 2;
  if (!snapshot.visual.hasGenericPurpleGradient) score += 2;

  if (score < 22) {
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
  const genericVisualPenalty = snapshot.visual.hasGenericPurpleGradient ? 86 : categories.visual < 22 ? 90 : 100;
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
