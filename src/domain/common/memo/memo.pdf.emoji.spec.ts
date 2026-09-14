import { ActorContext } from '@core/actor-context/actor.context';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { parseOffice } from 'officeparser';
import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as Y from 'yjs';
import { memoSchema } from './conversion/memo.extensions';
import { MemoPdfRenderer } from './memo.pdf.renderer';

const fontkit = require('fontkit') as {
  create(bytes: Buffer): {
    getGlyph(id: number): { path: { commands: unknown[] } };
  };
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
    const content = await page.getTextContent();
    return {
      items: content.items
        .filter(item => 'str' in item)
        .map(item => ({ text: item.str, fontName: item.fontName })),
      styles: content.styles,
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
      fontName?: string;
      glyphIds: number[];
    }> = [];
    let fontName: string | undefined;
    for (const [index, operator] of operators.fnArray.entries()) {
      if (operator === OPS.setFont)
        fontName = (operators.argsArray[index] as [string, number])[0];
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
        text.push({
          text: drawnGlyphs.map(glyph => glyph.unicode ?? '').join(''),
          fontName,
          glyphIds: drawnGlyphs.map(glyph => glyph.originalCharCode),
        });
      }
    }
    return text;
  } finally {
    await document.destroy();
  }
};

const embeddedFontOutlines = async (pdf: Buffer) => {
  const document = await PDFDocument.load(pdf);
  const fonts = new Map<string, ReturnType<(typeof fontkit)['create']>>();
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    const fontName = object.get(PDFName.of('FontName'));
    const file =
      object.get(PDFName.of('FontFile2')) ??
      object.get(PDFName.of('FontFile3'));
    if (!fontName || !file) continue;
    const stream = document.context.lookup(file);
    if (!(stream instanceof PDFRawStream)) continue;
    const bytes = Buffer.from(decodePDFRawStream(stream).decode());
    fonts.set(fontName.toString().replace(/^\//, ''), fontkit.create(bytes));
  }
  return fonts;
};

const expectEmbeddedOutline = async (
  pdf: Buffer,
  fontMarker: string,
  glyphId: number
) => {
  const fonts = await embeddedFontOutlines(pdf);
  const entry = [...fonts.entries()].find(([name]) =>
    name.includes(fontMarker)
  );
  expect(entry, `embedded ${fontMarker} subset`).toBeDefined();
  expect(entry![1].getGlyph(glyphId).path.commands.length).toBeGreaterThan(0);
};

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
    expect(glyphOperators.every(item => item.fontName)).toBe(true);
    const party = glyphOperators.find(item => item.text === '🎉');
    const check = glyphOperators.find(item => item.text === '✓');
    expect(party?.glyphIds).toEqual([1]);
    expect(check?.glyphIds).toEqual([1]);
    await expectEmbeddedOutline(pdf, 'NotoEmoji', party!.glyphIds[0]);
    await expectEmbeddedOutline(pdf, 'NotoSansSymbols2', check!.glyphIds[0]);
  });

  it('keeps ordinary text in Roboto and subsets emoji fonts below the size budget', async () => {
    const ordinary = await render([paragraph('Ordinary memo text')]);
    const withEmoji = await render([paragraph('Ordinary memo text 🎉')]);
    const { items } = await inspectText(withEmoji);
    const ordinaryItem = items.find(item => item.text.includes('Ordinary'));
    const emojiItem = items.find(item => item.text.includes('🎉'));

    expect(ordinaryItem).toBeDefined();
    expect(emojiItem).toBeDefined();
    expect(ordinaryItem!.fontName).not.toBe(emojiItem!.fontName);
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
    expect(fallback?.glyphIds).toEqual([1]);
    await expectEmbeddedOutline(pdf, 'NotoSansSymbols2', fallback!.glyphIds[0]);
  });
});
