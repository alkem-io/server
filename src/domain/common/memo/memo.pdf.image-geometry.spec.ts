import { ActorContext } from '@core/actor-context/actor.context';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { getDocument, OPS, Util } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import * as Y from 'yjs';
import { memoSchema } from './conversion/memo.extensions';
import { MemoPdfRenderer } from './memo.pdf.renderer';

type Matrix = [number, number, number, number, number, number];
type Bounds = { left: number; top: number; right: number; bottom: number };

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

const image = (src: string, width?: number, height?: number) => ({
  type: 'image',
  attrs: { src, alt: 'Geometry probe', title: null, width, height },
});

const paintBounds = async (pdf: Buffer) => {
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  try {
    const images: Array<
      Bounds & { sourceWidth: number; sourceHeight: number }
    > = [];
    const verticalBorders: Array<{
      x: number;
      top: number;
      bottom: number;
    }> = [];
    let pageWidth = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      pageWidth ||= page.getViewport({ scale: 1 }).width;
      const operators = await page.getOperatorList();
      const stack: Matrix[] = [];
      let transform: Matrix = [1, 0, 0, 1, 0, 0];
      for (const [index, operator] of operators.fnArray.entries()) {
        if (operator === OPS.save) stack.push([...transform]);
        else if (operator === OPS.restore)
          transform = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (operator === OPS.transform)
          transform = Util.transform(
            transform,
            operators.argsArray[index] as Matrix
          ) as Matrix;
        else if (operator === OPS.paintImageXObject) {
          const [, sourceWidth, sourceHeight] = operators.argsArray[index] as [
            string,
            number,
            number,
          ];
          const apply = (point: [number, number]) => {
            Util.applyTransform(point, transform);
            return point;
          };
          const corners = [
            apply([0, 0]),
            apply([1, 0]),
            apply([0, 1]),
            apply([1, 1]),
          ];
          const xs = corners.map(point => point[0]);
          const ys = corners.map(point => point[1]);
          images.push({
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys),
            sourceWidth,
            sourceHeight,
          });
        } else if (operator === OPS.constructPath) {
          const pathSegments = operators.argsArray[index]?.[1] as
            | Array<Float32Array | null>
            | undefined;
          for (const segment of pathSegments ?? []) {
            if (
              !(segment instanceof Float32Array) ||
              segment.length !== 6 ||
              segment[0] !== 0 ||
              segment[3] !== 1
            )
              continue;
            const apply = (point: [number, number]) => {
              Util.applyTransform(point, transform);
              return point;
            };
            const [start, end] = [
              apply([segment[1], segment[2]]),
              apply([segment[4], segment[5]]),
            ];
            if (Math.abs(start[0] - end[0]) > 0.01) continue;
            verticalBorders.push({
              x: start[0],
              top: Math.min(start[1], end[1]),
              bottom: Math.max(start[1], end[1]),
            });
          }
        }
      }
    }
    return { pageWidth, images, verticalBorders };
  } finally {
    await document.destroy();
  }
};

describe('Memo PDF image geometry', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const internalUrl =
    'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
  const documentService = {
    isAlkemioDocumentURL: vi.fn((url: string) => url === internalUrl),
    getDocumentFromURL: vi.fn(async () => ({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    })),
  };
  const authorizationService = { grantAccessOrFail: vi.fn() };
  const fileServiceAdapter = { getDocumentContent: vi.fn() };
  const renderer = new MemoPdfRenderer(
    documentService as never,
    authorizationService as never,
    fileServiceAdapter as never
  );

  beforeEach(() => vi.clearAllMocks());

  it('fits a wide image inside the printable A4 width with its aspect ratio', async () => {
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 2400,
          height: 1200,
          channels: 3,
          background: { r: 30, g: 80, b: 140 },
        },
      })
        .png()
        .toBuffer()
    );
    const pdf = await renderer.render(
      toState([{ type: 'paragraph', content: [image(internalUrl)] }]),
      'bucket-1',
      actor
    );
    const { pageWidth, images } = await paintBounds(pdf);
    const [paint] = images.filter(node => node.sourceWidth === 1200);

    expect(paint).toBeDefined();
    expect(paint.left).toBeGreaterThanOrEqual(40);
    expect(paint.right).toBeLessThanOrEqual(pageWidth - 40);
    expect((paint.right - paint.left) / (paint.bottom - paint.top)).toBeCloseTo(
      2,
      1
    );
  });

  it('does not enlarge a small image with oversized authored dimensions', async () => {
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 100,
          height: 50,
          channels: 3,
          background: { r: 80, g: 40, b: 120 },
        },
      })
        .png()
        .toBuffer()
    );
    const pdf = await renderer.render(
      toState([
        {
          type: 'paragraph',
          content: [image(internalUrl, 300, 300)],
        },
      ]),
      'bucket-1',
      actor
    );
    const { images } = await paintBounds(pdf);
    const [paint] = images.filter(node => node.sourceWidth === 100);

    expect(paint.right - paint.left).toBeLessThanOrEqual(100);
    expect(paint.bottom - paint.top).toBeLessThanOrEqual(50);
    expect((paint.right - paint.left) / (paint.bottom - paint.top)).toBeCloseTo(
      2,
      1
    );
  });

  it('fits a wide image inside its three-column table cell', async () => {
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 2400,
          height: 1600,
          channels: 3,
          background: { r: 20, g: 110, b: 90 },
        },
      })
        .png()
        .toBuffer()
    );
    const cell = (content: unknown[]) => ({
      type: 'tableCell',
      content: [{ type: 'paragraph', content }],
    });
    const pdf = await renderer.render(
      toState([
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                cell([{ type: 'text', text: 'Left' }]),
                cell([image(internalUrl)]),
                cell([{ type: 'text', text: 'Right' }]),
              ],
            },
          ],
        },
      ]),
      'bucket-1',
      actor
    );
    const { images, verticalBorders } = await paintBounds(pdf);
    const [paint] = images.filter(node => node.sourceWidth === 1200);
    expect(paint).toBeDefined();
    const enclosingBorders = verticalBorders
      .filter(
        border =>
          border.top <= paint.top &&
          border.bottom >= paint.bottom &&
          (border.x <= paint.left || border.x >= paint.right)
      )
      .sort((left, right) => left.x - right.x);
    const leftBorders = enclosingBorders.filter(
      border => border.x <= paint.left
    );
    const leftBorder = leftBorders[leftBorders.length - 1];
    const rightBorder = enclosingBorders.find(
      border => border.x >= paint.right
    );

    expect(leftBorder).toBeDefined();
    expect(rightBorder).toBeDefined();
    expect(paint.left).toBeGreaterThan(leftBorder!.x);
    expect(paint.right).toBeLessThan(rightBorder!.x);
    expect((paint.right - paint.left) / (paint.bottom - paint.top)).toBeCloseTo(
      1.5,
      1
    );
  });

  it('fits an image within a table cell spanning two of three columns', async () => {
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 2400,
          height: 1200,
          channels: 3,
          background: { r: 60, g: 90, b: 130 },
        },
      })
        .png()
        .toBuffer()
    );
    const cell = (content: unknown[], colspan = 1) => ({
      type: 'tableCell',
      attrs: { colspan, rowspan: 1, colwidth: null, background: null },
      content: [{ type: 'paragraph', content }],
    });
    const pdf = await renderer.render(
      toState([
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                cell([image(internalUrl)], 2),
                cell([{ type: 'text', text: 'Third column' }]),
              ],
            },
          ],
        },
      ]),
      'bucket-1',
      actor
    );
    const { pageWidth, images } = await paintBounds(pdf);
    const [paint] = images.filter(node => node.sourceWidth === 1200);

    expect(paint).toBeDefined();
    expect(paint.left).toBeGreaterThanOrEqual(40);
    expect(paint.right).toBeLessThanOrEqual(pageWidth - 40);
    expect(paint.right - paint.left).toBeLessThanOrEqual(
      ((pageWidth - 80) * 2) / 3
    );
  });
});
