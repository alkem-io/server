import { join } from 'node:path';

const fontkit = require('fontkit') as {
  openSync(path: string): {
    layout(text: string): { glyphs: Array<{ id: number }> };
  };
};

export const memoFontFiles = {
  NotoEmoji: join(__dirname, 'fonts', 'NotoEmoji', 'NotoEmoji-wght.ttf'),
  NotoSansSymbols2: join(
    __dirname,
    'fonts',
    'NotoSansSymbols2',
    'NotoSansSymbols2-Regular.ttf'
  ),
} as const;

export const memoPdfFonts = {
  NotoEmoji: {
    normal: memoFontFiles.NotoEmoji,
    bold: memoFontFiles.NotoEmoji,
    italics: memoFontFiles.NotoEmoji,
    bolditalics: memoFontFiles.NotoEmoji,
  },
  NotoSansSymbols2: {
    normal: memoFontFiles.NotoSansSymbols2,
    bold: memoFontFiles.NotoSansSymbols2,
    italics: memoFontFiles.NotoSansSymbols2,
    bolditalics: memoFontFiles.NotoSansSymbols2,
  },
};

export type MemoTextRun = {
  text: string;
  font?: keyof typeof memoPdfFonts;
};

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const extendedPictographic = /\p{Extended_Pictographic}/u;
const regionalIndicator = /\p{Regional_Indicator}/u;
const explicitSymbol = /[\u2600-\u27bf]/u;
const emojiSequenceMarker = /[\ufe0f\u20e3]/u;
const fallbackGlyph = '□';

const emojiFont = fontkit.openSync(memoFontFiles.NotoEmoji);
const symbolFont = fontkit.openSync(memoFontFiles.NotoSansSymbols2);

const supports = (
  font: ReturnType<(typeof fontkit)['openSync']>,
  grapheme: string
) => font.layout(grapheme).glyphs.every(glyph => glyph.id !== 0);

const targetFont = (
  grapheme: string
): keyof typeof memoPdfFonts | undefined => {
  if (
    extendedPictographic.test(grapheme) ||
    regionalIndicator.test(grapheme) ||
    emojiSequenceMarker.test(grapheme)
  )
    return 'NotoEmoji';
  if (explicitSymbol.test(grapheme)) return 'NotoSansSymbols2';
  return undefined;
};

const appendRun = (runs: MemoTextRun[], run: MemoTextRun) => {
  const previous = runs[runs.length - 1];
  if (previous && previous.font === run.font) previous.text += run.text;
  else runs.push(run);
};

export const splitMemoFontRuns = (text: string): MemoTextRun[] => {
  const runs: MemoTextRun[] = [];
  for (const { segment } of segmenter.segment(text)) {
    const font = targetFont(segment);
    if (!font) {
      appendRun(runs, { text: segment });
      continue;
    }
    const selectedFont = font === 'NotoEmoji' ? emojiFont : symbolFont;
    appendRun(
      runs,
      supports(selectedFont, segment)
        ? { text: segment, font }
        : { text: fallbackGlyph, font: 'NotoSansSymbols2' }
    );
  }
  return runs;
};

export const applyMemoFontRuns = (value: unknown): void => {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const child = value[index];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const node = child as Record<string, unknown>;
        if (typeof node.text === 'string') {
          const runs = splitMemoFontRuns(node.text);
          if (runs.some(run => run.font)) {
            const { text: _text, ...inlineAttributes } = node;
            const inlineRuns = runs.map(run => ({
              ...inlineAttributes,
              ...run,
            }));
            value.splice(index, 1, ...inlineRuns);
            index += inlineRuns.length - 1;
            continue;
          }
        }
      }
      applyMemoFontRuns(child);
    }
    return;
  }

  Object.values(value).forEach(applyMemoFontRuns);
};
