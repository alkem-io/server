import sharp from 'sharp';
import { markdownToYjsV2State } from './conversion';
import { MemoPdfExecutorChild } from './memo.pdf.executor.child';
import { ChildMessage } from './memo.pdf.executor.protocol';

const imageUrl =
  'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
const stateOf = (markdown: string) =>
  Buffer.from(markdownToYjsV2State(markdown));

const channel = () => {
  const sent: ChildMessage[] = [];
  const exits: number[] = [];
  const child = new MemoPdfExecutorChild(
    (message, delivered) => {
      sent.push(message);
      delivered?.();
    },
    code => exits.push(code)
  );
  const nextOfType = async <T extends ChildMessage['type']>(type: T) => {
    await vi.waitFor(() =>
      expect(sent.some(message => message.type === type)).toBe(true)
    );
    return sent.find(message => message.type === type) as Extract<
      ChildMessage,
      { type: T }
    >;
  };
  return { child, sent, exits, nextOfType };
};

describe('MemoPdfExecutorChild', () => {
  it('renders the state it is started with and exits after DONE is delivered', async () => {
    const { child, exits, nextOfType } = channel();

    child.receive({ type: 'START', jobId: 'job-1', state: stateOf('# Hello') });
    const done = await nextOfType('DONE');

    expect(done.jobId).toBe('job-1');
    expect(done.pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(done.imageCount).toBe(0);
    expect(exits).toEqual([0]);
  });

  it('asks the parent for each image and embeds the JPEG it receives', async () => {
    const { child, sent, exits, nextOfType } = channel();
    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#f00' },
    })
      .jpeg()
      .toBuffer();

    child.receive({
      type: 'START',
      jobId: 'job-1',
      state: stateOf(`Before\n\n![img](${imageUrl})`),
    });
    const request = await nextOfType('RESOLVE_IMAGE');
    expect(request).toEqual({
      type: 'RESOLVE_IMAGE',
      jobId: 'job-1',
      index: 0,
      src: imageUrl,
    });
    child.receive({
      type: 'IMAGE',
      jobId: 'job-1',
      index: 0,
      outcome: { kind: 'data', jpeg, width: 2, height: 2 },
    });
    const done = await nextOfType('DONE');

    // The JPEG crossed as raw bytes; the data URL is built here, in the child.
    expect(done.pdf.toString('latin1')).toContain('/DCTDecode');
    expect(done.imageCount).toBe(1);
    expect(
      sent.filter(message => message.type === 'RESOLVE_IMAGE')
    ).toHaveLength(1);
    expect(exits).toEqual([0]);
  });

  it('renders a link when the parent answers that an image is not embeddable', async () => {
    const { child, nextOfType } = channel();

    child.receive({
      type: 'START',
      jobId: 'job-1',
      state: stateOf(`![img](${imageUrl})`),
    });
    await nextOfType('RESOLVE_IMAGE');
    child.receive({
      type: 'IMAGE',
      jobId: 'job-1',
      index: 0,
      outcome: { kind: 'link' },
    });
    const done = await nextOfType('DONE');

    expect(done.imageCount).toBe(0);
    expect(done.pdf.toString('latin1')).not.toContain('/DCTDecode');
  });

  it('reports a renderer cap as FAILED invalid with the neutral message', async () => {
    const { child, nextOfType } = channel();
    const images = Array.from(
      { length: 21 },
      (_, index) => `![img ${index}](${imageUrl})`
    ).join('\n\n');

    child.receive({ type: 'START', jobId: 'job-1', state: stateOf(images) });
    const failed = await nextOfType('FAILED');

    expect(failed).toEqual({
      type: 'FAILED',
      jobId: 'job-1',
      kind: 'invalid',
      message: 'Memo PDF supports at most 20 images',
    });
  });

  it('reports any other failure as FAILED crashed with no content', async () => {
    const { child, nextOfType } = channel();

    child.receive({
      type: 'START',
      jobId: 'job-1',
      state: Buffer.from('SECRET not a yjs update'),
    });
    const failed = await nextOfType('FAILED');

    expect(failed.kind).toBe('crashed');
    expect(failed.message).not.toContain('SECRET');
    expect(failed.message).toMatch(/^[A-Za-z]*Error$/);
  });

  it('exits 1 on a second START', async () => {
    const { child, exits } = channel();

    child.receive({
      type: 'START',
      jobId: 'job-1',
      state: stateOf(`![a](${imageUrl})`),
    });
    child.receive({ type: 'START', jobId: 'job-2', state: stateOf('x') });

    expect(exits).toEqual([1]);
  });

  it('exits 1 on an IMAGE nobody asked for', () => {
    const { child, exits } = channel();

    child.receive({
      type: 'IMAGE',
      jobId: 'job-1',
      index: 0,
      outcome: { kind: 'link' },
    });

    expect(exits).toEqual([1]);
  });

  it('exits 1 on an IMAGE answering the wrong index or job', async () => {
    for (const answer of [
      { jobId: 'job-1', index: 1 },
      { jobId: 'job-2', index: 0 },
    ]) {
      const { child, exits, nextOfType } = channel();
      child.receive({
        type: 'START',
        jobId: 'job-1',
        state: stateOf(`![img](${imageUrl})`),
      });
      await nextOfType('RESOLVE_IMAGE');

      child.receive({ type: 'IMAGE', ...answer, outcome: { kind: 'link' } });

      expect(exits).toEqual([1]);
    }
  });

  it('exits 1 on a malformed message', () => {
    const { child, exits } = channel();

    child.receive({ type: 'START', jobId: 'job-1', state: 'not a buffer' });

    expect(exits).toEqual([1]);
  });

  it('exits 0 on disconnect when idle and 1 while a render is in flight', async () => {
    const idle = channel();
    idle.child.disconnect();
    expect(idle.exits).toEqual([0]);

    const busy = channel();
    busy.child.receive({
      type: 'START',
      jobId: 'job-1',
      state: stateOf(`![img](${imageUrl})`),
    });
    await busy.nextOfType('RESOLVE_IMAGE');
    busy.child.disconnect();
    expect(busy.exits).toEqual([1]);
  });
});
