import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import sharp from 'sharp';

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
const allowedFonts = new Set(Object.values(fonts.Roboto));
pdfMake.addFonts(fonts);
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy(path => allowedFonts.has(path));

// PR #6469 renderer evidence bounds synchronous layout and source decoding.
const MAX_MARKDOWN_BYTES = 100_000;
const MAX_IMAGES = 20;
const MAX_SOURCE_IMAGE_PIXELS = 16_777_216;
const MAX_RENDERED_IMAGE_EDGE = 1200;
const supportedElement =
  /^(a|blockquote|br|code|em|h[1-6]|hr|img|li|mark|ol|p|pre|s|strong|table|tbody|td|th|thead|tr|ul)$/;

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

@Injectable()
export class MemoPdfRenderer {
  private readonly markdown = new MarkdownIt({ html: true, linkify: false });
  private readonly convertHtml = htmlToPdfMake;

  constructor(
    private readonly documentService: DocumentService,
    private readonly authorizationService: AuthorizationService,
    private readonly fileServiceAdapter: FileServiceAdapter
  ) {}

  async render(markdown: string, bucketId: string, actor: ActorContext) {
    if (Buffer.byteLength(markdown) > MAX_MARKDOWN_BYTES)
      invalid(
        `Signing preview supports at most ${MAX_MARKDOWN_BYTES.toLocaleString('en-US')} bytes of memo content`
      );
    const dom = new JSDOM(`<body>${this.markdown.render(markdown)}</body>`);
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
      if (!supportedElement.test(tag) && tag !== 'iframe')
        replaceWithLink(node, `Unsupported content: ${tag}`, '');
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
      invalid(`Signing preview supports at most ${MAX_IMAGES} images`);
    const imageData = new Map<string, string>();
    const substituteImageData = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const node = value as Record<string, unknown>;
      if (typeof node.image === 'string' && imageData.has(node.image))
        node.image = imageData.get(node.image);
      Object.values(node).forEach(substituteImageData);
    };
    let normalizedImageBytes = 0;
    for (const [index, image] of images.entries()) {
      const source = image.src;
      if (!this.documentService.isAlkemioDocumentURL(source)) {
        replaceWithLink(image, `Image: ${image.alt || source}`, source);
        continue;
      }
      const stored = await this.documentService.getDocumentFromURL(source, {
        relations: { authorization: true, storageBucket: true },
      });
      if (!stored?.storageBucket || stored.storageBucket.id !== bucketId)
        invalid('Signing image does not belong to the memo bucket');
      this.authorizationService.grantAccessOrFail(
        actor,
        stored!.authorization,
        AuthorizationPrivilege.READ,
        `read signing image: ${stored!.id}`
      );
      const bytes = await this.fileServiceAdapter.getDocumentContent(
        stored!.id
      );
      try {
        const jpeg = await sharp(bytes, {
          limitInputPixels: MAX_SOURCE_IMAGE_PIXELS,
        })
          .rotate()
          .resize(MAX_RENDERED_IMAGE_EDGE, MAX_RENDERED_IMAGE_EDGE, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .flatten({ background: '#ffffff' })
          .toColourspace('srgb')
          .jpeg({ quality: 80 })
          .toBuffer();
        normalizedImageBytes += jpeg.length;
        if (normalizedImageBytes > 16 * 1024 * 1024)
          invalid('Signing images exceed the 16 MiB normalized size limit');
        image.src = `memo-signing-image-${index}`;
        imageData.set(
          image.src,
          `data:image/jpeg;base64,${jpeg.toString('base64')}`
        );
      } catch (error) {
        if (error instanceof ValidationException) throw error;
        if (error instanceof Error && /pixel limit/i.test(error.message))
          invalid(
            `Signing image supports at most ${MAX_SOURCE_IMAGE_PIXELS.toLocaleString('en-US')} source pixels`
          );
        replaceWithLink(image, `Image: ${image.alt || source}`, source);
      }
    }

    const content = this.convertHtml(document.body.innerHTML, {
      window: dom.window as unknown as Window,
      defaultStyles: { mark: { background: '#fff59d' } },
    });
    substituteImageData(content);
    return pdfMake
      .createPdf({ content, defaultStyle: { font: 'Roboto', fontSize: 10 } })
      .getBuffer();
  }
}
