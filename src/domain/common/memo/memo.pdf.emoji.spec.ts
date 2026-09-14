import { join } from 'node:path';
import { ActorContext } from '@core/actor-context/actor.context';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { parseOffice } from 'officeparser';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as Y from 'yjs';
import { memoSchema } from './conversion/memo.extensions';
import { splitMemoFontRuns } from './memo.pdf.fonts';
import { MemoPdfRenderer } from './memo.pdf.renderer';

type FontGlyph = {
  id: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  path: { commands: unknown[] };
};
type ParsedFont = {
  getGlyph(id: number): FontGlyph;
  layout(text: string): { glyphs: FontGlyph[] };
};
const fontkit = require('fontkit') as {
  create(bytes: Buffer): ParsedFont;
  openSync(path: string): ParsedFont;
};

const toState = (content: unknown[]): Buffer => {
  const ydoc = prosemirrorToYDoc(
    memoSchema.nodeFromJSON({ type: 'doc', content }),
    'default'
  );
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const paragraph = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const inspectText = async (pdf: Buffer) => {
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  try {
    const page = await document.getPage(1);
    await page.getOperatorList();
    const content = await page.getTextContent();
    return {
      items: content.items
        .filter(item => 'str' in item)
        .map(item => ({ text: item.str, fontName: item.fontName })),
    };
  } finally {
    await document.destroy();
  }
};

const inspectTextOperators = async (pdf: Buffer) => {
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  try {
    const page = await document.getPage(1);
    const operators = await page.getOperatorList();
    const text: Array<{
      text: string;
      fontResource?: string;
      embeddedFontName?: string;
      cids: number[];
    }> = [];
    let fontResource: string | undefined;
    for (const [index, operator] of operators.fnArray.entries()) {
      if (operator === OPS.setFont)
        fontResource = (operators.argsArray[index] as [string, number])[0];
      if (operator === OPS.showText) {
        const glyphs = operators.argsArray[index][0] as Array<
          | number
          | {
              originalCharCode: number;
              unicode?: string;
            }
        >;
        const drawnGlyphs = glyphs.filter(
          (glyph): glyph is Exclude<(typeof glyphs)[number], number> =>
            typeof glyph !== 'number'
        );
        const font = fontResource
          ? (
              page.commonObjs as never as {
                get(name: string): { name?: string };
              }
            ).get(fontResource)
          : undefined;
        text.push({
          text: drawnGlyphs.map(glyph => glyph.unicode ?? '').join(''),
          fontResource,
          embeddedFontName: font?.name,
          cids: drawnGlyphs.map(glyph => glyph.originalCharCode),
        });
      }
    }
    return text;
  } finally {
    await document.destroy();
  }
};

const embeddedFont = async (pdf: Buffer, embeddedFontName: string) => {
  const document = await PDFDocument.load(pdf);
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    if (object.get(PDFName.of('Subtype'))?.toString() !== '/Type0') continue;
    const baseFont = object.get(PDFName.of('BaseFont'));
    if (baseFont?.toString().replace(/^\//, '') !== embeddedFontName) continue;
    const descendants = document.context.lookup(
      object.get(PDFName.of('DescendantFonts'))
    );
    if (!(descendants instanceof PDFArray)) continue;
    const descendant = document.context.lookup(descendants.get(0));
    if (!(descendant instanceof PDFDict)) continue;
    const descriptor = document.context.lookup(
      descendant.get(PDFName.of('FontDescriptor'))
    );
    if (!(descriptor instanceof PDFDict)) continue;
    const file =
      descriptor.get(PDFName.of('FontFile2')) ??
      descriptor.get(PDFName.of('FontFile3'));
    if (!file) continue;
    const stream = document.context.lookup(file);
    if (!(stream instanceof PDFRawStream)) continue;
    const bytes = Buffer.from(decodePDFRawStream(stream).decode());
    const cidToGid = descendant.get(PDFName.of('CIDToGIDMap'));
    const gidForCid = (cid: number): number => {
      if (cidToGid?.toString() === '/Identity') return cid;
      const map = document.context.lookup(cidToGid);
      if (!(map instanceof PDFRawStream)) return 0;
      const mapping = decodePDFRawStream(map).decode();
      const offset = cid * 2;
      return offset + 1 < mapping.length
        ? (mapping[offset] << 8) | mapping[offset + 1]
        : 0;
    };
    return { font: fontkit.create(bytes), gidForCid, byteLength: bytes.length };
  }
  return undefined;
};

const expectEmbeddedOutline = async (
  pdf: Buffer,
  drawn: { embeddedFontName?: string; cids: number[] },
  sourceFontPath: string,
  sourceText: string
) => {
  expect(drawn.embeddedFontName).toBeDefined();
  expect(drawn.cids).toHaveLength(1);
  const subset = await embeddedFont(pdf, drawn.embeddedFontName!);
  expect(subset, `embedded ${drawn.embeddedFontName} subset`).toBeDefined();
  const gid = subset!.gidForCid(drawn.cids[0]);
  expect(gid).not.toBe(0);
  const actual = subset!.font.getGlyph(gid);
  const expected = fontkit.openSync(sourceFontPath).layout(sourceText)
    .glyphs[0];
  expect(expected.id).not.toBe(0);
  expect(expected.path.commands.length).toBeGreaterThan(0);
  expect(actual.path.commands.length).toBeGreaterThan(0);
  expect(actual.bbox).toEqual(expected.bbox);
  expect(actual.path.commands).toEqual(expected.path.commands);
  return subset!.byteLength;
};

const fontFixture = (family: 'NotoEmoji' | 'NotoSansSymbols2') =>
  family === 'NotoEmoji'
    ? join(__dirname, 'fonts', 'NotoEmoji', 'NotoEmoji-wght.ttf')
    : join(
        __dirname,
        'fonts',
        'NotoSansSymbols2',
        'NotoSansSymbols2-Regular.ttf'
      );

describe('Memo PDF emoji glyph coverage', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const renderer = new MemoPdfRenderer({} as never, {} as never, {} as never);
  const render = (content: unknown[]) =>
    renderer.render(toState(content), 'bucket-1', actor);

  it('renders and extracts emoji and symbol glyphs in memo block contexts', async () => {
    const pdf = await render([
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Celebrate 🎉' }],
      },
      paragraph('Approved ✓'),
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [paragraph('Party 🎉')] }],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [paragraph('Checked ✓')],
              },
            ],
          },
        ],
      },
    ]);
    const text = (await parseOffice(pdf, { fileType: 'pdf', ocr: false }))
      .toText()
      .replace(/\s+/g, ' ');

    expect(text).toContain('Celebrate 🎉');
    expect(text).toContain('Approved ✓');
    expect(text).toContain('Party 🎉');
    expect(text).toContain('Checked ✓');

    const { items } = await inspectText(pdf);
    const emojiItems = items.filter(item => /[🎉✓]/u.test(item.text));
    expect(emojiItems).toHaveLength(4);
    expect(emojiItems[0].fontName).toBe(emojiItems[2].fontName);
    expect(emojiItems[1].fontName).toBe(emojiItems[3].fontName);
    expect(emojiItems[0].fontName).not.toBe(emojiItems[1].fontName);
    expect(pdf.toString('latin1')).toContain('NotoEmoji');
    expect(pdf.toString('latin1')).toContain('NotoSansSymbols2');
    const glyphOperators = (await inspectTextOperators(pdf)).filter(item =>
      /[🎉✓]/u.test(item.text)
    );
    expect(glyphOperators).toHaveLength(4);
    expect(glyphOperators.every(item => item.fontResource)).toBe(true);
    const party = glyphOperators.find(item => item.text === '🎉');
    const check = glyphOperators.find(item => item.text === '✓');
    expect(party?.embeddedFontName).toContain('NotoEmoji');
    expect(check?.embeddedFontName).toContain('NotoSansSymbols2');
    await expectEmbeddedOutline(pdf, party!, fontFixture('NotoEmoji'), '🎉');
    await expectEmbeddedOutline(
      pdf,
      check!,
      fontFixture('NotoSansSymbols2'),
      '✓'
    );
  });

  it('keeps ordinary text in Roboto and subsets emoji fonts below the size budget', async () => {
    const ordinary = await render([paragraph('Ordinary memo text')]);
    const withEmoji = await render([paragraph('Ordinary memo text 🎉')]);
    const { items } = await inspectText(withEmoji);
    const ordinaryItem = items.find(item => item.text.includes('Ordinary'));
    const emojiItem = items.find(item => item.text.includes('🎉'));
    const operators = await inspectTextOperators(withEmoji);
    const ordinaryOperator = operators.find(item =>
      item.text.includes('Ordinary')
    );
    const emojiOperator = operators.find(item => item.text.includes('🎉'));

    expect(ordinaryItem).toBeDefined();
    expect(emojiItem).toBeDefined();
    expect(ordinaryItem!.fontName).not.toBe(emojiItem!.fontName);
    expect(ordinaryOperator?.embeddedFontName).toContain('Roboto');
    expect(emojiOperator?.embeddedFontName).toContain('NotoEmoji');
    expect(withEmoji.toString('latin1')).toContain('Roboto');
    expect(withEmoji.length - ordinary.length).toBeLessThan(200_000);
  });

  it('renders a visible replacement with an embedded outline for unsupported emoji', async () => {
    const pdf = await render([paragraph('Unsupported 🫩 remains visible')]);
    const text = (await parseOffice(pdf, { fileType: 'pdf', ocr: false }))
      .toText()
      .replace(/\s+/g, ' ');
    const [fallback] = (await inspectTextOperators(pdf)).filter(item =>
      item.text.includes('□')
    );

    expect(text).toContain('Unsupported □ remains visible');
    expect(fallback?.embeddedFontName).toContain('NotoSansSymbols2');
    await expectEmbeddedOutline(
      pdf,
      fallback!,
      fontFixture('NotoSansSymbols2'),
      '□'
    );
  });

  it('routes only emoji graphemes and explicit symbols away from Roboto', () => {
    expect(splitMemoFontRuns('Plain 🎉 ✓ text')).toEqual([
      { text: 'Plain ' },
      { text: '🎉', font: 'NotoEmoji' },
      { text: ' ' },
      { text: '✓', font: 'NotoSansSymbols2' },
      { text: ' text' },
    ]);
    expect(splitMemoFontRuns('👩🏽‍💻 🇳🇱 1️⃣ ©️')).toEqual([
      { text: '👩🏽‍💻', font: 'NotoEmoji' },
      { text: ' ' },
      { text: '🇳🇱', font: 'NotoEmoji' },
      { text: ' ' },
      { text: '1️⃣', font: 'NotoEmoji' },
      { text: ' ' },
      { text: '©️', font: 'NotoEmoji' },
    ]);
    expect(splitMemoFontRuns('Unsupported 🫩')).toEqual([
      { text: 'Unsupported ' },
      { text: '□', font: 'NotoSansSymbols2' },
    ]);
  });
});
