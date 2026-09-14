import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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

const inspectInlineMarks = async (pdf: Buffer) => {
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  try {
    const page = await document.getPage(1);
    const operators = await page.getOperatorList();
    const annotations = await page.getAnnotations();
    return {
      constructPaths: operators.fnArray.filter(
        operator => operator === OPS.constructPath
      ).length,
      links: annotations
        .filter(annotation => annotation.subtype === 'Link')
        .map(annotation => annotation.url ?? annotation.unsafeUrl),
    };
  } finally {
    await document.destroy();
  }
};

const baseFontName = (embeddedFontName?: string) =>
  embeddedFontName?.replace(/^[A-Z]{6}\+/, '');

const textOperator = (
  operators: Awaited<ReturnType<typeof inspectTextOperators>>,
  text: string
) => operators.find(operator => operator.text === text);

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
  expect(drawn.cids.length).toBeGreaterThan(0);
  const subset = await embeddedFont(pdf, drawn.embeddedFontName!);
  expect(subset, `embedded ${drawn.embeddedFontName} subset`).toBeDefined();
  const expectedGlyphs = fontkit
    .openSync(sourceFontPath)
    .layout(sourceText).glyphs;
  expect(drawn.cids).toHaveLength(expectedGlyphs.length);
  for (const [index, cid] of drawn.cids.entries()) {
    const gid = subset!.gidForCid(cid);
    expect(gid).not.toBe(0);
    const actual = subset!.font.getGlyph(gid);
    const expected = expectedGlyphs[index];
    expect(expected.id).not.toBe(0);
    expect(expected.path.commands.length).toBeGreaterThan(0);
    expect(actual.path.commands.length).toBeGreaterThan(0);
    expect(actual.bbox).toEqual(expected.bbox);
    expect(actual.path.commands).toEqual(expected.path.commands);
  }
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

  it('pins the two vendored font files to their documented hashes', async () => {
    const fixtures = [
      [
        fontFixture('NotoEmoji'),
        'de6c18832938afc99caf132b39d6a30a19bac7f2e812e28db2535b4608d27551',
      ],
      [
        fontFixture('NotoSansSymbols2'),
        '7d5fb73b7ca67a6798101741f5d280a3d016a56a197afcd4199dbb57b4b82a21',
      ],
    ] as const;

    for (const [path, expected] of fixtures)
      expect(
        createHash('sha256')
          .update(await readFile(path))
          .digest('hex')
      ).toBe(expected);
  });

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

  const markedText = (
    value: string,
    marks: Array<{ type: string; attrs?: Record<string, unknown> }>
  ) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: value, marks }],
  });

  it('preserves bold on ordinary runs around emoji in the emitted PDF', async () => {
    const marks = [{ type: 'bold' }];
    const control = await inspectTextOperators(
      await render([markedText('Boldcontrol', marks)])
    );
    const marked = await inspectTextOperators(
      await render([markedText('Bold 🎉 check ✓', marks)])
    );
    const controlRun = textOperator(control, 'Boldcontrol');
    const markedRun = textOperator(marked, 'Bold ');

    expect(controlRun?.fontResource).toBeDefined();
    expect(markedRun?.fontResource).toBeDefined();
    expect(baseFontName(controlRun?.embeddedFontName)).toBe('Roboto-Medium');
    expect(baseFontName(markedRun?.embeddedFontName)).toBe(
      baseFontName(controlRun?.embeddedFontName)
    );
  });

  it('preserves italics on ordinary runs around emoji in the emitted PDF', async () => {
    const marks = [{ type: 'italic' }];
    const control = await inspectTextOperators(
      await render([markedText('Italiccontrol', marks)])
    );
    const marked = await inspectTextOperators(
      await render([markedText('Italic 🎉 check ✓', marks)])
    );
    const controlRun = textOperator(control, 'Italiccontrol');
    const markedRun = textOperator(marked, 'Italic ');

    expect(controlRun?.fontResource).toBeDefined();
    expect(markedRun?.fontResource).toBeDefined();
    expect(baseFontName(controlRun?.embeddedFontName)).toBe('Roboto-Italic');
    expect(baseFontName(markedRun?.embeddedFontName)).toBe(
      baseFontName(controlRun?.embeddedFontName)
    );
  });

  it('emits underline geometry for emoji-bearing text above its plain baseline', async () => {
    const value = 'Underline 🎉 check ✓';
    const baseline = await inspectInlineMarks(await render([paragraph(value)]));
    const marked = await inspectInlineMarks(
      await render([markedText(value, [{ type: 'underline' }])])
    );

    expect(marked.constructPaths).toBeGreaterThan(baseline.constructPaths);
  });

  it('emits exact link annotations for emoji-bearing text', async () => {
    const link = 'https://example.com/signed-memo';
    const marks = [{ type: 'link', attrs: { href: link, target: '_blank' } }];
    const control = await inspectInlineMarks(
      await render([markedText('Link control', marks)])
    );
    const marked = await inspectInlineMarks(
      await render([markedText('Link 🎉 check ✓', marks)])
    );
    const emojiOnly = await inspectInlineMarks(
      await render([markedText('🎉', marks)])
    );
    const symbolOnly = await inspectInlineMarks(
      await render([markedText('✓', marks)])
    );

    expect(control.links.length).toBeGreaterThan(0);
    expect(control.links.every(href => href === link)).toBe(true);
    expect(marked.links.length).toBeGreaterThan(0);
    expect(marked.links.every(href => href === link)).toBe(true);
    expect(emojiOnly.links.length).toBeGreaterThan(0);
    expect(emojiOnly.links.every(href => href === link)).toBe(true);
    expect(symbolOnly.links.length).toBeGreaterThan(0);
    expect(symbolOnly.links.every(href => href === link)).toBe(true);
  });

  it('preserves nested link and bold marks around emoji in the emitted PDF', async () => {
    const link = 'https://example.com/signed-memo';
    const marks = [
      { type: 'link', attrs: { href: link, target: '_blank' } },
      { type: 'bold' },
    ];
    const controlPdf = await render([markedText('Nestedcontrol', marks)]);
    const markedPdf = await render([markedText('Nested 🎉 check ✓', marks)]);
    const control = await inspectTextOperators(controlPdf);
    const marked = await inspectTextOperators(markedPdf);
    const controlRun = textOperator(control, 'Nestedcontrol');
    const markedRun = textOperator(marked, 'Nested ');
    const markedLinks = (await inspectInlineMarks(markedPdf)).links;

    expect(controlRun?.fontResource).toBeDefined();
    expect(markedRun?.fontResource).toBeDefined();
    expect(baseFontName(controlRun?.embeddedFontName)).toBe('Roboto-Medium');
    expect(baseFontName(markedRun?.embeddedFontName)).toBe(
      baseFontName(controlRun?.embeddedFontName)
    );
    expect(markedLinks.length).toBeGreaterThan(0);
    expect(markedLinks.every(href => href === link)).toBe(true);
  });

  it('renders complete supported emoji grapheme sequences in an actual PDF', async () => {
    const sequences = ['👩🏽‍💻', '🇳🇱', '1️⃣', '©️'];
    const pdf = await render([paragraph(sequences.join(' '))]);
    const extracted = (await parseOffice(pdf, { fileType: 'pdf', ocr: false }))
      .toText()
      .replace(/\s+/g, ' ');
    const operators = await inspectTextOperators(pdf);

    for (const sequence of sequences) {
      expect(extracted).toContain(sequence);
      const drawn = operators.find(item => item.text.includes(sequence));
      expect(drawn?.embeddedFontName).toContain('NotoEmoji');
      await expectEmbeddedOutline(
        pdf,
        drawn!,
        fontFixture('NotoEmoji'),
        sequence
      );
    }
  });
});
