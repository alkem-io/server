import { fork } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ActorContext } from '@core/actor-context/actor.context';
import { parseOffice } from 'officeparser';
import sharp from 'sharp';
import { markdownToYjsV2State } from './conversion';
import { ChildMessage, ParentMessage } from './memo.pdf.executor.protocol';
import { inProcessMemoPdfRenderer } from './memo.pdf.test-helper';

// Forks the COMPILED worker entry exactly as production does, proving that the
// build output boots outside the test tooling: alias registration, the copied
// font assets and the binary IPC channel. It needs `pnpm build` first and skips
// itself when there is no build output, except under MEMO_PDF_DIST_GATE=1,
// where a missing build is a failure.
const distMemo = resolve(process.cwd(), 'dist/domain/common/memo');
const entry = join(distMemo, 'memo.pdf.executor.entry.js');
const gated = process.env.MEMO_PDF_DIST_GATE === '1';

const imageUrl =
  'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
const markdown = `# Title\n\nHello ==mark== 🙂 [link](https://example.com)\n\n![img](${imageUrl})`;

const extractText = async (pdf: Buffer) =>
  (await parseOffice(pdf, { fileType: 'pdf', ocr: false })).toText();

describe.skipIf(!gated && !existsSync(entry))(
  'memo PDF executor — compiled entry',
  () => {
    it('renders in a forked compiled worker with the same text and images as in process', async () => {
      expect(existsSync(entry)).toBe(true);
      expect(
        readFileSync(join(distMemo, 'memo.pdf.executor.js'), 'utf8')
      ).toContain('memo.pdf.executor.entry.js');
      expect(
        existsSync(join(distMemo, 'fonts', 'NotoEmoji', 'NotoEmoji-wght.ttf'))
      ).toBe(true);

      const jpeg = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#f00' },
      })
        .jpeg()
        .toBuffer();
      const state = Buffer.from(markdownToYjsV2State(markdown));

      const child = fork(entry, [], {
        execPath: process.execPath,
        execArgv: ['--max-old-space-size=256'],
        env: { LANG: 'en_US.UTF-8' },
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        serialization: 'advanced',
      });
      let stderr = '';
      child.stderr?.on('data', chunk => {
        stderr += chunk;
      });
      const exited = new Promise<number | null>(resolveExit =>
        child.once('exit', code => resolveExit(code))
      );
      const done = new Promise<Extract<ChildMessage, { type: 'DONE' }>>(
        (resolveDone, rejectDone) => {
          const timer = setTimeout(() => {
            child.kill('SIGKILL');
            rejectDone(new Error(`No DONE within 20 s. stderr: ${stderr}`));
          }, 20_000);
          child.on('message', (message: ChildMessage) => {
            if (message.type === 'RESOLVE_IMAGE') {
              const answer: ParentMessage = {
                type: 'IMAGE',
                jobId: message.jobId,
                index: message.index,
                outcome: { kind: 'data', jpeg, width: 2, height: 2 },
              };
              child.send(answer);
            } else {
              clearTimeout(timer);
              if (message.type === 'DONE') resolveDone(message);
              else
                rejectDone(
                  new Error(
                    `Worker failed: ${JSON.stringify(message)} ${stderr}`
                  )
                );
            }
          });
          child.once('exit', code => {
            clearTimeout(timer);
            rejectDone(new Error(`Worker exited ${code}. stderr: ${stderr}`));
          });
        }
      );
      const start: ParentMessage = { type: 'START', jobId: 'job-1', state };
      child.send(start);

      const result = await done;
      expect(await exited).toBe(0);
      expect(result.jobId).toBe('job-1');
      expect(result.pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(result.imageCount).toBe(1);

      const inProcess = await inProcessMemoPdfRenderer({
        documentService: {
          isAlkemioDocumentURL: (url: string) => url === imageUrl,
          getDocumentFromURL: async () => ({
            id: 'image-1',
            authorization: { id: 'image-auth' },
            storageBucket: { id: 'bucket-1' },
          }),
        },
        authorizationService: { grantAccessOrFail: () => undefined },
        fileServiceAdapter: { getDocumentContent: async () => jpeg },
      }).render(
        state,
        'bucket-1',
        Object.assign(new ActorContext(), { actorID: 'actor-1' })
      );

      const workerText = await extractText(result.pdf);
      expect(workerText).toContain('Hello mark');
      expect(workerText).toBe(await extractText(inProcess));
      const imagesIn = (pdf: Buffer) =>
        pdf.toString('latin1').match(/\/DCTDecode/g)?.length ?? 0;
      expect(imagesIn(result.pdf)).toBe(1);
      expect(imagesIn(result.pdf)).toBe(imagesIn(inProcess));
    }, 30_000);
  }
);
