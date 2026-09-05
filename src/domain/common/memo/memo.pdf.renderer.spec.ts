import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import { parseOffice } from 'officeparser';
import { MemoPdfRenderer } from './memo.pdf.renderer';

const htmlToPdfMake = require('html-to-pdfmake') as (
  html: string,
  options: { window: unknown }
) => unknown;
const pdfMake = require('pdfmake') as {
  localAccessPolicy(path: string): boolean;
  urlAccessPolicy(url: string): boolean;
};
const fonts = require('pdfmake/fonts/Roboto') as {
  Roboto: Record<string, string>;
};

const extractText = async (pdf: Buffer): Promise<string> => {
  const document = await parseOffice(pdf, { fileType: 'pdf', ocr: false });
  return document.toText();
};

const countRenderedInk = async (pdf: Buffer): Promise<number> => {
  const officeRequire = createRequire(require.resolve('officeparser'));
  const pdfJsPath = officeRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfJsRequire = createRequire(pdfJsPath);
  const { createCanvas } = pdfJsRequire(
    '@napi-rs/canvas'
  ) as typeof import('@napi-rs/canvas');
  const pdfJs = await import(pathToFileURL(pdfJsPath).href);
  const document = await pdfJs.getDocument({ data: new Uint8Array(pdf) })
    .promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  await document.destroy();
  return pixels.reduce(
    (count, channel, index) =>
      index % 4 === 3 && channel > 0 && pixels[index - 3] < 240
        ? count + 1
        : count,
    0
  );
};

describe('MemoPdfRenderer', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const internalUrl =
    'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
  const documentService = {
    isAlkemioDocumentURL: vi.fn((url: string) => url === internalUrl),
    getDocumentFromURL: vi.fn(),
  };
  const authorizationService = { grantAccessOrFail: vi.fn() };
  const fileServiceAdapter = { getDocumentContent: vi.fn() };
  const renderer = new MemoPdfRenderer(
    documentService as any,
    authorizationService as any,
    fileServiceAdapter as any
  );

  beforeEach(() => {
    vi.clearAllMocks();
    documentService.getDocumentFromURL.mockReset();
    authorizationService.grantAccessOrFail.mockReset();
    fileServiceAdapter.getDocumentContent.mockReset();
  });

  it('renders the current projection into a real PDF with representative structure', async () => {
    const pdf = await renderer.render(
      [
        '# Capture heading',
        '',
        'Text with **bold**, *emphasis*, [a safe link](https://example.com), and `inline code`.',
        '',
        '- Parent',
        '  - Nested child',
        '',
        '```ts',
        'const preserved =  2;',
        '```',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
        '',
        '> quoted',
        '',
        'Γειά σου',
      ].join('\n'),
      'bucket-1',
      actor
    );

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = await extractText(pdf);
    expect(text).toContain('Capture heading');
    expect(text).toContain('Nested child');
    expect(text).toContain('const preserved = 2;');
    expect(text).toContain('A');
    expect(text).toContain('quoted');
    expect(text).toContain('Γειά σου');
  });

  it('renders European platform languages and a visible box for an unsupported symbol', async () => {
    const supported = [
      'Nederlands: officiële beëindiging',
      'Español: acción e información',
      'Български: подписан документ',
      'Deutsch: Größe und äußere',
      'Français: été, cœur où',
    ];
    const pdf = await renderer.render(
      supported.join('\n\n'),
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    for (const sample of supported) expect(text).toContain(sample);
    expect(pdf.toString('latin1')).toContain('Roboto-Regular');

    // Roboto has no U+2713. Rendering that character alone must still put
    // visible replacement ink on the actual PDF page rather than omit it.
    expect(
      await countRenderedInk(await renderer.render('✓', 'bucket-1', actor))
    ).toBeGreaterThan(0);
  });

  it('preserves code whitespace in the converter structure before text extraction normalizes it', () => {
    const dom = new JSDOM(
      `<body>${new MarkdownIt().render('```ts\nconst preserved =  2;\n```')}</body>`
    );
    const content = htmlToPdfMake(dom.window.document.body.innerHTML, {
      window: dom.window,
    });

    expect(JSON.stringify(content)).toContain('const preserved =  2;');
  });

  it('allows only the registered embedded fonts through the local access policy', () => {
    expect(pdfMake.urlAccessPolicy('https://example.com/font.ttf')).toBe(false);
    expect(pdfMake.localAccessPolicy(Object.values(fonts.Roboto)[0])).toBe(
      true
    );
    expect(pdfMake.localAccessPolicy('/tmp/unregistered-font.ttf')).toBe(false);
  });

  it('renders current-projection highlight markers without exposing the markers', async () => {
    const text = await extractText(
      await renderer.render('Before ==highlighted== after', 'bucket-1', actor)
    );

    expect(text).toContain('Before highlighted after');
    expect(text).not.toContain('==');
  });

  it('loads only an authorized image from the memo bucket', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      )
    );

    const pdf = await renderer.render(
      `Before ![approved](${internalUrl}) after`,
      'bucket-1',
      actor
    );

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(documentService.getDocumentFromURL).toHaveBeenCalledWith(
      internalUrl,
      { relations: { authorization: true, storageBucket: true } }
    );
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      { id: 'image-auth' },
      AuthorizationPrivilege.READ,
      expect.any(String)
    );
    expect(fileServiceAdapter.getDocumentContent).toHaveBeenCalledWith(
      'image-1'
    );
  });

  it('uses labelled safe links for external images and embeds without fetching', async () => {
    const pdf = await renderer.render(
      [
        '![diagram](https://example.com/diagram.svg)',
        '<img src="https://example.com/no-alt.png">',
        '<iframe src="https://example.com/embed"></iframe>',
        '<iframe src="%"></iframe>',
      ].join('\n'),
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Image: diagram');
    expect(text).toContain('Image: https://example.com/no-alt.png');
    expect(text).toContain('Embedded content: https://example.com/embed');
    expect(text).toContain('Embedded content: %');
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('never fetches authored local, data, or unsupported-scheme image URLs', async () => {
    const pdf = await renderer.render(
      [
        '![local](file:///etc/passwd)',
        '![inline](data:text/plain,SECRET_DATA_TEXT)',
        '![ftp](ftp://example.com/image.png)',
      ].join('\n'),
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Image: ftp');
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('fails instead of turning an unauthorized private image into a link', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });

    await expect(
      renderer.render(`![private](${internalUrl})`, 'bucket-1', actor)
    ).rejects.toThrow('denied');
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('rejects an internal image belonging to another bucket', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'other-bucket' },
    });

    await expect(
      renderer.render(`![private](${internalUrl})`, 'bucket-1', actor)
    ).rejects.toThrow(/memo bucket/i);
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
  });

  it('rejects a missing private image without turning it into a link', async () => {
    documentService.getDocumentFromURL.mockResolvedValue(undefined);

    await expect(
      renderer.render(`![private](${internalUrl})`, 'bucket-1', actor)
    ).rejects.toThrow(/memo bucket/i);
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('uses a labelled link for an authorized but unsupported private image', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      Buffer.from('unsupported image bytes')
    );

    const pdf = await renderer.render(`![](${internalUrl})`, 'bucket-1', actor);

    expect(await extractText(pdf)).toContain(`Image: ${internalUrl}`);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
  });

  it('propagates an unreadable private image instead of using fallback', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockRejectedValue(
      new Error('private read failed')
    );

    await expect(
      renderer.render(`![private](${internalUrl})`, 'bucket-1', actor)
    ).rejects.toThrow('private read failed');
  });

  it('removes authored scripts and converter overrides', async () => {
    const pdf = await renderer.render(
      '<script>SECRET_SCRIPT_TEXT</script><p data-pdfmake="{bad:true}" onclick="bad()">Visible</p><a href="file:///etc/passwd">Local link</a>',
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Visible');
    expect(text).toContain('Local link');
    expect(text).not.toContain('SECRET_SCRIPT_TEXT');
  });
});
