import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ActorContext } from '@core/actor-context/actor.context';
import { MemoPdfRenderer } from '@domain/common/memo/memo.pdf.renderer';
import sharp from 'sharp';

const describeRealServices =
  process.env.CONTENT_SIGNING_REAL_SERVICES === 'true'
    ? describe
    : describe.skip;

const imageUrl = (index: number) =>
  `https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-${index.toString().padStart(12, '0')}`;
const realisticSources = [
  'docs/images/alkemio-server-design.png',
  'docs/images/login-session-extend-flow.png',
  'docs/images/alkemio-services-networking.png',
  'docs/images/pagination-efficiency.png',
  'docs/images/templates-domain.png',
];

const fitAsciiBytes = (prefix: string, bytes: number): string => {
  const paragraph =
    'Representative signed memo paragraph with **bold**, *emphasis*, and a [link](https://example.com).\n\n';
  return `${prefix}${paragraph.repeat(Math.ceil(bytes / paragraph.length))}`.slice(
    0,
    bytes
  );
};

const structuredMarkdown = (imageCount: number, bytes: number) => {
  const images = Array.from(
    { length: imageCount },
    (_, index) => `![bounded image ${index}](${imageUrl(index)})`
  ).join('\n\n');
  return fitAsciiBytes(
    [
      '# Bounded signing preview',
      '',
      '- first list item',
      '- second list item',
      '',
      '| Column A | Column B |',
      '| --- | --- |',
      '| value A | value B |',
      '',
      images,
      '',
    ].join('\n'),
    bytes
  );
};

const noisyJpeg = () =>
  sharp(randomBytes(1200 * 1200 * 3), {
    raw: { width: 1200, height: 1200, channels: 3 },
  })
    .jpeg({ quality: 65 })
    .toBuffer();

const createRenderer = (sources: Buffer[]) => {
  const documents = new Map(
    sources.map((source, index) => [imageUrl(index), { index, source }])
  );
  return new MemoPdfRenderer(
    {
      isAlkemioDocumentURL: (url: string) => documents.has(url),
      getDocumentFromURL: async (url: string) => ({
        id: url,
        authorization: { id: `auth-${url}` },
        storageBucket: { id: 'bucket-1' },
      }),
    } as any,
    { grantAccessOrFail: () => undefined } as any,
    {
      getDocumentContent: async (url: string) => documents.get(url)!.source,
    } as any
  );
};

const renderAndAssert = async (
  label: string,
  sources: Buffer[],
  markdownBytes: number
) => {
  const renderer = createRenderer(sources);
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const markdown = structuredMarkdown(sources.length, markdownBytes);
  const started = performance.now();
  const pdf = await renderer.render(markdown, 'bucket-1', actor);
  const elapsed = performance.now() - started;
  const pdfText = pdf.toString('latin1');
  const imageObjects = pdfText.match(/\/Subtype \/Image/g)?.length ?? 0;
  const dctImages = pdfText.match(/\/DCTDecode/g)?.length ?? 0;

  process.stdout.write(
    `memo-render-ci case=${label} samples=1 markdown=${Buffer.byteLength(markdown)} images=${sources.length} sourceBytes=${sources.reduce((sum, source) => sum + source.length, 0)} pdf=${pdf.length} imageObjects=${imageObjects} dct=${dctImages} ms=${elapsed.toFixed(1)} maxRssMiB=${(process.resourceUsage().maxRSS / 1024).toFixed(1)}\n`
  );
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(imageObjects).toBe(sources.length);
  expect(dctImages).toBe(sources.length);
  expect(elapsed).toBeLessThan(10_000);
};

describeRealServices('MemoPdfRenderer bounded fixture performance', () => {
  it('renders a representative structured memo with five repository images', async () => {
    const sources = await Promise.all(
      realisticSources.map(path => readFile(resolve(process.cwd(), path)))
    );
    await renderAndAssert('representative', sources, 50_000);
  }, 30_000);

  it('renders the maximum text and image-count fixture inside the target', async () => {
    const sources: Buffer[] = [];
    for (let index = 0; index < 20; index++) sources.push(await noisyJpeg());
    await renderAndAssert('maximum', sources, 100_000);
  }, 60_000);
});
