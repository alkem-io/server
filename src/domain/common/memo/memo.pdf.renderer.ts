import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Injectable } from '@nestjs/common';
import { MAX_MEMO_EDITOR_CONTENT_BYTES } from './conversion/yjs.state.to.tiptap.html';
import { MemoPdfExecutor, MemoPdfRenderPurpose } from './memo.pdf.executor';
import { MemoPdfImageResolver } from './memo.pdf.image.resolver';

/**
 * The single entry point for rendering a memo state to PDF, used by both the
 * download and the signing preview. The layout runs in a forked worker (see
 * MemoPdfExecutor); this process only checks the input size and resolves the
 * memo's images on the worker's request.
 */
@Injectable()
export class MemoPdfRenderer {
  constructor(
    private readonly imageResolver: MemoPdfImageResolver,
    private readonly executor: MemoPdfExecutor
  ) {}

  /**
   * `readState` reads the memo's state. It runs only once the render is
   * admitted, so a refused request never joins the live document.
   */
  async render(
    readState: () => Promise<Buffer>,
    bucketId: string | undefined,
    actor: ActorContext,
    options: {
      signal?: AbortSignal;
      memoId?: string;
      purpose?: MemoPdfRenderPurpose;
    } = {}
  ): Promise<Buffer> {
    return this.executor.run({
      // Rejected here, before a worker is spent on it; the worker repeats the
      // check on the decoded document.
      readState: async () => {
        const state = await readState();
        if (state.byteLength > MAX_MEMO_EDITOR_CONTENT_BYTES)
          throw new ValidationException(
            `Memo PDF supports at most ${MAX_MEMO_EDITOR_CONTENT_BYTES.toLocaleString('en-US')} bytes of memo editor content`,
            LogContext.MEMOS
          );
        return state;
      },
      resolveImage: this.imageResolver.bind(bucketId, actor),
      actorId: actor.actorID,
      memoId: options.memoId,
      signal: options.signal,
      // The signing preview calls without options; it is the default so that
      // it keeps the render capacity downloads may not take.
      purpose: options.purpose ?? 'signing',
    });
  }
}
