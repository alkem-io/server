import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { MemoPdfRenderer } from './memo.pdf.renderer';

const extractText = async (pdf: Buffer): Promise<string> => {
  const document = await getDocument({
    data: new Uint8Array(pdf),
    disableWorker: true,
  }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map(item => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
    );
  }
  await document.destroy();
  return pages.join('\n');
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

  beforeEach(() => vi.clearAllMocks());

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
    expect(text).toContain('const preserved =  2;');
    expect(text).toContain('A');
    expect(text).toContain('quoted');
    expect(text).toContain('Γειά σου');
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
        '<iframe src="https://example.com/embed"></iframe>',
      ].join('\n'),
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Image: diagram');
    expect(text).toContain('Embedded content: https://example.com/embed');
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

  it('removes authored scripts and converter overrides', async () => {
    const pdf = await renderer.render(
      '<script>SECRET_SCRIPT_TEXT</script><p data-pdfmake="{bad:true}" onclick="bad()">Visible</p>',
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Visible');
    expect(text).not.toContain('SECRET_SCRIPT_TEXT');
  });
});
