import { describe, expect, it } from "vitest";
import { scoreUiSnapshot, type UiStyleSnapshot } from "./style-score";

const completeMusicSnapshot: UiStyleSnapshot = {
  features: {
    browse: true,
    search: true,
    library: true,
    queue: true,
    favorites: true,
    playlists: true,
    lyrics: true,
    player: true,
  },
  visual: {
    background: "rgb(240, 249, 255)",
    accentColors: ["rgb(2, 132, 199)", "rgb(14, 165, 233)", "rgb(56, 189, 248)", "rgb(245, 158, 11)"],
    fontFamilies: ["Righteous", "Poppins", "Avenir Next"],
    hasAtmosphere: true,
    hasGenericPurpleGradient: false,
  },
  composition: {
    cardCount: 13,
    interactiveCount: 24,
    hasAsymmetry: true,
    hasPersistentPlayer: true,
    hasMotion: true,
  },
  accessibility: {
    landmarkCount: 8,
    namedButtonCount: 18,
    focusableCount: 24,
    hasVisibleFocus: true,
  },
  responsive: {
    viewportWidth: 390,
    scrollWidth: 390,
    hasMiniPlayer: true,
    hasMobileAdaptation: true,
  },
};

describe("scoreUiSnapshot", () => {
  it("passes a feature-complete distinctive music UI", () => {
    const score = scoreUiSnapshot(completeMusicSnapshot);

    expect(score.total).toBeGreaterThan(90);
    expect(score.passed).toBe(true);
  });

  it("rejects generic white purple Inter styling", () => {
    const score = scoreUiSnapshot({
      ...completeMusicSnapshot,
      visual: {
        background: "rgb(255, 255, 255)",
        accentColors: ["rgb(168, 85, 247)"],
        fontFamilies: ["Inter", "Arial", "system-ui"],
        hasAtmosphere: false,
        hasGenericPurpleGradient: true,
      },
      composition: {
        ...completeMusicSnapshot.composition,
        hasAsymmetry: false,
        hasMotion: false,
      },
    });

    expect(score.total).toBeLessThanOrEqual(90);
    expect(score.passed).toBe(false);
    expect(score.notes).toContain("Visual direction is too generic for the required distinctive music product.");
  });

  it("rejects sky-blue styling when type and color direction are still generic", () => {
    const score = scoreUiSnapshot({
      ...completeMusicSnapshot,
      visual: {
        background: "rgb(255, 255, 255)",
        accentColors: ["rgb(14, 165, 233)", "rgb(56, 189, 248)", "rgb(125, 211, 252)", "rgb(186, 230, 253)"],
        fontFamilies: ["Inter", "Arial", "system-ui"],
        hasAtmosphere: true,
        hasGenericPurpleGradient: false,
      },
    });

    expect(score.total).toBeLessThanOrEqual(90);
    expect(score.passed).toBe(false);
    expect(score.notes).toContain("Visual direction is too generic for the required distinctive music product.");
  });

  it("rejects palettes that only contain sky-blue variations and neutral colors", () => {
    const score = scoreUiSnapshot({
      ...completeMusicSnapshot,
      visual: {
        background: "rgb(240 249 255)",
        accentColors: ["rgb(0 0 0)", "rgb(255 255 255)", "rgb(14 165 233)", "rgb(56 189 248)"],
        fontFamilies: ["Righteous", "Poppins", "Avenir Next"],
        hasAtmosphere: true,
        hasGenericPurpleGradient: false,
      },
    });

    expect(score.total).toBeLessThanOrEqual(90);
    expect(score.passed).toBe(false);
    expect(score.notes).toContain("Visual direction is too generic for the required distinctive music product.");
  });

  it("rejects colors that only contain sky-blue channel digits as substrings", () => {
    const score = scoreUiSnapshot({
      ...completeMusicSnapshot,
      visual: {
        background: "rgb(240, 249, 255)",
        accentColors: ["rgb(214, 165, 233)", "rgb(245, 158, 11)", "rgb(251, 113, 133)", "rgb(45, 212, 191)"],
        fontFamilies: ["Righteous", "Poppins", "Avenir Next"],
        hasAtmosphere: true,
        hasGenericPurpleGradient: false,
      },
    });

    expect(score.total).toBeLessThanOrEqual(90);
    expect(score.passed).toBe(false);
    expect(score.notes).toContain("Visual direction is too generic for the required distinctive music product.");
  });

  it("caps the score when key music features are missing", () => {
    const score = scoreUiSnapshot({
      ...completeMusicSnapshot,
      features: {
        ...completeMusicSnapshot.features,
        lyrics: false,
        queue: false,
        favorites: false,
      },
    });

    expect(score.total).toBeLessThanOrEqual(90);
    expect(score.passed).toBe(false);
    expect(score.notes).toContain("Missing required first-version music features: queue, favorites, lyrics.");
  });

  it("notes responsive and generic failures when no other note is available", () => {
    const score = scoreUiSnapshot({
      ...completeMusicSnapshot,
      responsive: {
        viewportWidth: 390,
        scrollWidth: 480,
        hasMiniPlayer: false,
        hasMobileAdaptation: false,
      },
    });

    expect(score.total).toBeLessThanOrEqual(90);
    expect(score.notes).toContain("Responsive behavior does not yet satisfy the mobile music-player requirement.");

    const lowScore = scoreUiSnapshot({
      ...completeMusicSnapshot,
      composition: {
        cardCount: 1,
        interactiveCount: 1,
        hasAsymmetry: false,
        hasPersistentPlayer: false,
        hasMotion: false,
      },
      accessibility: {
        landmarkCount: 0,
        namedButtonCount: 0,
        focusableCount: 0,
        hasVisibleFocus: false,
      },
    });
    expect(lowScore.notes).toContain("UI score must be greater than 90 to pass.");
  });
});
