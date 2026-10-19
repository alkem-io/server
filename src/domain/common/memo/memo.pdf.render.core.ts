import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { JSDOM } from 'jsdom';
import { blankLineReplacement } from './conversion/const';
import { yjsStateToTiptapHtml } from './conversion/yjs.state.to.tiptap.html';
import {
  applyMemoFontRuns,
  memoFontFiles,
  memoPdfFonts,
} from './memo.pdf.fonts';

// pdfmake and html-to-pdfmake publish CommonJS without TypeScript declarations.
const htmlToPdfMake = require('html-to-pdfmake') as (
  html: string,
  options: { window: Window; defaultStyles?: Record<string, unknown> }
) => unknown;
const pdfMake = require('pdfmake') as {
  addFonts(fonts: unknown): void;
  setUrlAccessPolicy(policy: (url: string) => boolean): void;
  setLocalAccessPolicy(policy: (path: string) => boolean): void;
  createPdf(definition: unknown): { getBuffer(): Promise<Buffer> };
};
const fonts = require('pdfmake/fonts/Roboto') as {
  Roboto: Record<string, string>;
};
const allowedFonts = new Set([
  ...Object.values(fonts.Roboto),
  ...Object.values(memoFontFiles),
]);
pdfMake.addFonts({ ...fonts, ...memoPdfFonts });
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy(path => allowedFonts.has(path));

// Measured renderer bounds for synchronous layout and source decoding.
export const MAX_IMAGES = 20;
export const MAX_SOURCE_IMAGE_PIXELS = 16_777_216;
const A4_PAGE_WIDTH = 595.28;
const A4_PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const PRINTABLE_WIDTH = A4_PAGE_WIDTH - PAGE_MARGIN * 2;
const PRINTABLE_HEIGHT = A4_PAGE_HEIGHT - PAGE_MARGIN * 2;
const LIST_INDENT = 20;
const TABLE_CELL_CHROME = 10;
const supportedElement =
  /^(a|blockquote|br|code|em|h[1-6]|hr|img|li|mark|ol|p|pre|s|strong|table|tbody|td|th|thead|tr|u|ul)$/;
const embeddedElement =
  /^(audio|button|canvas|embed|form|input|link|math|meta|object|select|svg|template|textarea|video)$/;

const isSafeUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const invalid = (message: string): never => {
  throw new ValidationException(message, LogContext.MEMOS);
};

/**
 * What the image resolver decided for one authored image: a normalised JPEG to
 * embed, or a labelled link (external or unsupported image), exactly as the
 * renderer did before the resolution moved out of the layout process.
 */
export type MemoPdfImageOutcome =
  | { kind: 'data'; jpeg: Buffer; width: number; height: number }
  | { kind: 'link' };

/**
 * Resolves one authored image, in document order. Throws for a cap breach, a
 * foreign-bucket image or a denied read; the render fails with that error.
 */
export type ResolveMemoImage = (
  src: string,
  index: number
) => Promise<MemoPdfImageOutcome>;

/**
 * The memo PDF layout: sanitise the editor HTML, embed the resolved images and
 * lay the document out with pdfmake. It has no dependency-injected
 * collaborator — storage, authorization and file reads arrive only through
 * `resolveImage` — so the same code runs inside the render worker process and
 * in the in-process test helper.
 */
export class MemoPdfRenderCore {
  private readonly convertHtml = htmlToPdfMake;

  constructor(private readonly resolveImage: ResolveMemoImage) {}

  async render(state: Buffer): Promise<Buffer> {
    return this.renderHtml(yjsStateToTiptapHtml(state));
  }

  protected async renderHtml(html: string): Promise<Buffer> {
    const dom = new JSDOM(`<body>${html}</body>`);
    const { document } = dom.window;
    const replaceWithLink = (node: Element, label: string, target: string) => {
      const replacement = document.createElement(
        isSafeUrl(target) ? 'a' : 'span'
      );
      replacement.textContent = label;
      if (replacement instanceof dom.window.HTMLAnchorElement)
        replacement.href = target;
      node.replaceWith(replacement);
    };

    document.querySelectorAll('script,style').forEach(node => node.remove());
    document.body.querySelectorAll('*').forEach(node => {
      const tag = node.tagName.toLowerCase();
      if (supportedElement.test(tag) || tag === 'iframe') return;
      if (embeddedElement.test(tag))
        replaceWithLink(node, `Unsupported content: ${tag}`, '');
      else node.replaceWith(...Array.from(node.childNodes));
    });
    document.querySelectorAll<HTMLElement>('*').forEach(node => {
      for (const name of node.getAttributeNames())
        if (['data-pdfmake', 'style'].includes(name) || name.startsWith('on'))
          node.removeAttribute(name);
    });
    document.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
      if (!isSafeUrl(link.href)) link.removeAttribute('href');
    });
    document
      .querySelectorAll<HTMLIFrameElement>('iframe')
      .forEach(frame =>
        replaceWithLink(frame, `Embedded content: ${frame.src}`, frame.src)
      );

    const walker = document.createTreeWalker(
      document.body,
      dom.window.NodeFilter.SHOW_TEXT
    );
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    for (const textNode of textNodes) {
      if (textNode.parentElement?.closest('code,pre')) continue;
      const parts = textNode.data.split(/(==[^=\n]+==)/g);
      if (parts.length === 1) continue;
      textNode.replaceWith(
        ...parts.map((part, index) => {
          if (!(index % 2)) return part;
          const mark = document.createElement('mark');
          mark.textContent = part.slice(2, -2);
          return mark;
        })
      );
    }

    const images = [...document.querySelectorAll<HTMLImageElement>('img')];
    if (images.length > MAX_IMAGES)
      invalid(`Memo PDF supports at most ${MAX_IMAGES} images`);
    const imageData = new Map<
      string,
      { dataUrl: string; width: number; height: number }
    >();
    const substituteImageData = (
      value: unknown,
      availableWidth = PRINTABLE_WIDTH
    ): void => {
      if (!value || typeof value !== 'object') return;
      const node = value as Record<string, unknown>;
      if (typeof node.image === 'string') {
        const normalized = imageData.get(node.image);
        if (normalized) {
          const authoredWidth =
            typeof node.width === 'number'
              ? node.width
              : Number.POSITIVE_INFINITY;
          const authoredHeight =
            typeof node.height === 'number'
              ? node.height
              : Number.POSITIVE_INFINITY;
          node.image = normalized.dataUrl;
          node.maxWidth = Math.min(
            availableWidth,
            normalized.width,
            authoredWidth
          );
          node.maxHeight = Math.min(
            PRINTABLE_HEIGHT,
            normalized.height,
            authoredHeight
          );
          delete node.width;
          delete node.height;
          delete node.fit;
        }
      }
      if (node.table && typeof node.table === 'object') {
        const body = (node.table as { body?: unknown[][] }).body;
        if (Array.isArray(body))
          for (const row of body) {
            const columns = row.length;
            for (const cell of row) {
              const colSpan =
                typeof cell === 'object' &&
                cell !== null &&
                typeof (cell as Record<string, unknown>).colSpan === 'number'
                  ? ((cell as Record<string, unknown>).colSpan as number)
                  : 1;
              substituteImageData(
                cell,
                Math.max(
                  1,
                  (availableWidth * colSpan) / columns - TABLE_CELL_CHROME
                )
              );
            }
          }
        return;
      }
      const childWidth =
        node.nodeName === 'UL' || node.nodeName === 'OL'
          ? Math.max(1, availableWidth - LIST_INDENT)
          : availableWidth;
      Object.values(node).forEach(child =>
        substituteImageData(child, childWidth)
      );
    };
    for (const [index, image] of images.entries()) {
      const outcome = await this.resolveImage(image.src, index);
      if (outcome.kind === 'link') {
        replaceWithLink(image, `Image: ${image.alt || image.src}`, image.src);
        continue;
      }
      const placeholder = `memo-signing-image-${index}`;
      image.setAttribute('src', placeholder);
      imageData.set(placeholder, {
        dataUrl: `data:image/jpeg;base64,${outcome.jpeg.toString('base64')}`,
        width: outcome.width,
        height: outcome.height,
      });
    }

    document.querySelectorAll('p:empty').forEach(paragraph => {
      paragraph.textContent = blankLineReplacement;
    });

    const content = this.convertHtml(document.body.innerHTML, {
      window: dom.window as unknown as Window,
      defaultStyles: { mark: { background: '#fff59d' } },
    });
    substituteImageData(content);
    applyMemoFontRuns(content);
    return pdfMake
      .createPdf({
        pageSize: 'A4',
        pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN],
        content,
        defaultStyle: { font: 'Roboto', fontSize: 10 },
      })
      .getBuffer();
  }
}
