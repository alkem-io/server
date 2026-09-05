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

const isSafeUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

@Injectable()
export class MemoPdfRenderer {
  private readonly markdown = new MarkdownIt({ html: true, linkify: false });

  constructor(
    private readonly documentService: DocumentService,
    private readonly authorizationService: AuthorizationService,
    private readonly fileServiceAdapter: FileServiceAdapter
  ) {}

  async render(markdown: string, bucketId: string, actor: ActorContext) {
    const highlighted = markdown.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
    const dom = new JSDOM(`<body>${this.markdown.render(highlighted)}</body>`);
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

    document
      .querySelectorAll('script,style,object,embed')
      .forEach(node => node.remove());
    document.querySelectorAll<HTMLElement>('*').forEach(node => {
      for (const attribute of [...node.attributes])
        if (
          ['data-pdfmake', 'style'].includes(attribute.name) ||
          attribute.name.startsWith('on')
        )
          node.removeAttribute(attribute.name);
    });
    document.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
      if (!isSafeUrl(link.href)) link.removeAttribute('href');
    });
    document
      .querySelectorAll<HTMLIFrameElement>('iframe')
      .forEach(frame =>
        replaceWithLink(frame, `Embedded content: ${frame.src}`, frame.src)
      );

    for (const image of document.querySelectorAll<HTMLImageElement>('img')) {
      const source = image.src;
      if (!this.documentService.isAlkemioDocumentURL(source)) {
        replaceWithLink(image, `Image: ${image.alt || source}`, source);
        continue;
      }
      const stored = await this.documentService.getDocumentFromURL(source, {
        relations: { authorization: true, storageBucket: true },
      });
      if (!stored?.storageBucket || stored.storageBucket.id !== bucketId)
        throw new ValidationException(
          'Signing image does not belong to the memo bucket',
          LogContext.MEMOS
        );
      this.authorizationService.grantAccessOrFail(
        actor,
        stored.authorization,
        AuthorizationPrivilege.READ,
        `read signing image: ${stored.id}`
      );
      const bytes = await this.fileServiceAdapter.getDocumentContent(stored.id);
      try {
        const png = await sharp(bytes).rotate().png().toBuffer();
        image.src = `data:image/png;base64,${png.toString('base64')}`;
      } catch {
        replaceWithLink(image, `Image: ${image.alt || source}`, source);
      }
    }

    const content = htmlToPdfMake(document.body.innerHTML, {
      window: dom.window as unknown as Window,
      defaultStyles: { mark: { background: '#fff59d' } },
    });
    return pdfMake
      .createPdf({ content, defaultStyle: { font: 'Roboto', fontSize: 10 } })
      .getBuffer();
  }
}
