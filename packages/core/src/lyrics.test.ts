import { describe, expect, it, vi } from "vitest";
import { parseLyrics } from "./lyrics";

describe("parseLyrics", () => {
  it("returns an empty lyric for blank input", () => {
    expect(parseLyrics("")).toMatchObject({
      type: 0,
      lines: [],
      raw: "",
    });
  });

  it("parses plain text lyrics without timestamps", () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");

    expect(parseLyrics("first line\nsecond line")).toEqual({
      type: 1,
      raw: "first line\nsecond line",
      lines: [
        { id: "00000000-0000-4000-8000-000000000001", sentence: "first line" },
        { id: "00000000-0000-4000-8000-000000000002", sentence: "second line" },
      ],
    });
  });

  it("parses timestamped lyrics with decimal precision", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000003");

    expect(parseLyrics("[01:02.345]hello")).toEqual({
      type: 2,
      raw: "[01:02.345]hello",
      lines: [{ id: "00000000-0000-4000-8000-000000000003", sentence: "hello", timeStamp: 62.345 }],
    });
  });

  it("ignores malformed lines when timestamp mode is detected", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000004");

    expect(parseLyrics("[00:01.00]valid\ninvalid")).toMatchObject({
      type: 2,
      lines: [{ id: "00000000-0000-4000-8000-000000000004", sentence: "valid", timeStamp: 1 }],
    });
  });
});
