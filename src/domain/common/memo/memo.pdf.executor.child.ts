import { ValidationException } from '@common/exceptions';
import {
  ChildMessage,
  ParentMessage,
  parseParentMessage,
} from './memo.pdf.executor.protocol';
import { MemoPdfImageOutcome, MemoPdfRenderCore } from './memo.pdf.render.core';

type PendingImage = {
  index: number;
  resolve: (outcome: MemoPdfImageOutcome) => void;
};

/**
 * One render worker: renders exactly one memo state and exits. Images are
 * resolved by asking the parent, one at a time and in document order; the
 * worker never touches storage or authorization itself. Any message it does not
 * expect ends the worker without an answer.
 */
export class MemoPdfExecutorChild {
  private jobId: string | undefined;
  private pending: PendingImage | undefined;
  private finished = false;
  private imageCount = 0;

  constructor(
    private readonly send: (message: ChildMessage, sent?: () => void) => void,
    private readonly exit: (code: number) => void
  ) {}

  receive(raw: unknown): void {
    const message = parseParentMessage(raw);
    if (!message) {
      this.exit(1);
    } else if (message.type === 'IMAGE') {
      this.answerImage(message);
    } else if (this.jobId !== undefined) {
      this.exit(1);
    } else {
      this.jobId = message.jobId;
      void this.render(message.jobId, message.state);
    }
  }

  disconnect(): void {
    this.exit(this.jobId === undefined || this.finished ? 0 : 1);
  }

  private answerImage(message: Extract<ParentMessage, { type: 'IMAGE' }>) {
    const pending = this.pending;
    if (
      message.jobId !== this.jobId ||
      !pending ||
      message.index !== pending.index
    ) {
      this.exit(1);
      return;
    }
    this.pending = undefined;
    if (message.outcome.kind === 'data') this.imageCount++;
    pending.resolve(message.outcome);
  }

  private async render(jobId: string, state: Buffer): Promise<void> {
    const core = new MemoPdfRenderCore(
      (src, index) =>
        new Promise<MemoPdfImageOutcome>(resolve => {
          this.pending = { index, resolve };
          this.send({ type: 'RESOLVE_IMAGE', jobId, index, src });
        })
    );
    let answer: ChildMessage;
    try {
      const pdf = await core.render(state);
      answer = { type: 'DONE', jobId, pdf, imageCount: this.imageCount };
    } catch (error) {
      answer =
        error instanceof ValidationException
          ? { type: 'FAILED', jobId, kind: 'invalid', message: error.message }
          : {
              type: 'FAILED',
              jobId,
              kind: 'crashed',
              message: error instanceof Error ? error.name : 'Error',
            };
    }
    this.finished = true;
    this.send(answer, () => this.exit(0));
  }
}
