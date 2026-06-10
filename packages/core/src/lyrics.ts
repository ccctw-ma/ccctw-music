import type { Lyric } from "./types";

const TIMED_LYRIC_RE = /\[(\d+):(\d+)\.(\d+)](.*)/;

export function parseLyrics(input?: string | null): Lyric {
  const raw = input ?? "";
  const result: Lyric = {
    lines: [],
    type: 0,
    raw,
  };

  if (!raw.trim()) {
    return result;
  }

  const sentences = raw.split(/\r\n|\n/).filter(Boolean);
  if (sentences.length === 0) {
    return result;
  }

  const hasTimestamp = sentences.some((sentence) => TIMED_LYRIC_RE.test(sentence));
  result.type = hasTimestamp ? 2 : 1;

  for (const sentence of sentences) {
    if (!hasTimestamp) {
      result.lines.push({
        id: crypto.randomUUID(),
        sentence,
      });
      continue;
    }

    const matched = TIMED_LYRIC_RE.exec(sentence);
    if (!matched) {
      continue;
    }

    const [, minuteText, secondText, millisecondText, text] = matched;
    const minute = Number.parseInt(minuteText, 10);
    const second = Number.parseInt(secondText, 10);
    const millisecond = Number.parseInt(millisecondText, 10);
    const precision = millisecondText.length;

    result.lines.push({
      id: crypto.randomUUID(),
      timeStamp: minute * 60 + second + millisecond / 10 ** precision,
      sentence: text,
    });
  }

  return result;
}
