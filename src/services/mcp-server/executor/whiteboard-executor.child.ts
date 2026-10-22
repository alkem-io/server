import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import type {
  SemanticBatchResult,
  SemanticOperation,
} from '@excalidraw-yjs/excalidraw/headless';
import {
  CollaborationDocumentSession,
  CollaborationSessionEndError,
  DocumentPurgingError,
  ReadOnlyRoomError,
  UpdateRejectedError,
} from '../../collaboration-client/collaboration-document.session';
import {
  ChildLaunchGrant,
  ChildMessage,
  ExecutorOutcome,
  ImportInput,
  ParentMessage,
  PreparedResult,
  parseParentMessage,
  validId,
} from './whiteboard-executor.protocol';

const nodeRequire = createRequire(__filename);
export const prepareBatch = (
  session: CollaborationDocumentSession,
  operations: SemanticOperation[]
): SemanticBatchResult => {
  const fork: typeof import('@excalidraw-yjs/excalidraw/headless') =
    nodeRequire('@excalidraw-yjs/excalidraw/headless');
  const metrics: typeof import('@excalidraw-yjs/excalidraw/node-metrics') =
    nodeRequire('@excalidraw-yjs/excalidraw/node-metrics');
  return fork.prepareSemanticBatch(session.doc, operations, {
    textMetricsProvider: metrics.createNodeTextMetricsProvider(),
  });
};
export const prepareImport = (
  session: CollaborationDocumentSession,
  input: ImportInput
): ReturnType<
  typeof import('@excalidraw-yjs/excalidraw/headless')['prepareSceneImport']
> => {
  const fork: typeof import('@excalidraw-yjs/excalidraw/headless') =
    nodeRequire('@excalidraw-yjs/excalidraw/headless');
  const metrics: typeof import('@excalidraw-yjs/excalidraw/node-metrics') =
    nodeRequire('@excalidraw-yjs/excalidraw/node-metrics');
  return fork.prepareSceneImport(session.doc, input, {
    textMetricsProvider: metrics.createNodeTextMetricsProvider(),
  });
};

export class WhiteboardExecutorChild {
  private grant?: ChildLaunchGrant;
  private session?: CollaborationDocumentSession;
  private prepared?: Extract<PreparedResult, { ok: true }>;
  private generationId?: number;
  private afterGo = false;
  private finished = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly send: (message: ChildMessage) => void,
    private readonly exit: () => void,
    private readonly newSession: (
      grant: ChildLaunchGrant,
      lost: () => void
    ) => CollaborationDocumentSession,
    private readonly prepare = prepareBatch,
    private readonly importScene = prepareImport
  ) {}

  receive(raw: unknown): void {
    if (this.finished) return;
    // A later START is a rejected message, never a replacement or cancellation.
    if (
      this.grant &&
      typeof raw === 'object' &&
      raw !== null &&
      'type' in raw &&
      raw.type === 'START'
    ) {
      this.send({
        type: 'FAILED',
        jobId: this.grant.jobId,
        ...(this.generationId ? { generationId: this.generationId } : {}),
        typedOutcome: 'invalid',
      });
      return;
    }
    const parsed = parseParentMessage(raw);
    const message = parsed.data;
    if (!message) {
      const candidate = (
        raw as { childLaunchGrant?: { jobId?: unknown } } | null
      )?.childLaunchGrant?.jobId;
      this.fail('invalid', validId(candidate) ? candidate : undefined);
      return;
    }
    if (!this.grant) {
      if (message.type !== 'START') {
        this.fail('invalid');
        return;
      }
      this.grant = message.childLaunchGrant;
      if (this.remaining() <= 0) {
        this.fail('timeout-before-go');
        return;
      }
      this.timer = setTimeout(
        () => this.fail('timeout-before-go'),
        this.remaining()
      );
      void this.start(message);
      return;
    }
    if (
      message.type === 'START' ||
      message.jobId !== this.grant.jobId ||
      message.generationId !== this.generationId ||
      !this.prepared ||
      this.afterGo
    ) {
      this.fail('invalid');
      return;
    }
    if (message.type === 'CANCEL') {
      this.fail('cancelled-before-go');
      return;
    }
    if (this.remaining() <= 0) {
      this.fail('timeout-before-go');
      return;
    }
    if (this.session!.isReadOnly()) {
      this.fail('forbidden');
      return;
    }
    this.afterGo = true;
    void this.publish();
  }

  disconnect(): void {
    this.fail('cancelled-before-go');
  }

  private remaining() {
    return this.grant!.deadline - Date.now();
  }
  private open() {
    return this.newSession(this.grant!, () => {
      if (!this.afterGo) this.fail('cancelled-before-go');
    });
  }
  private async start(input: Extract<ParentMessage, { type: 'START' }>) {
    try {
      this.session = this.open();
      await this.session.connect(this.remaining());
      if (this.finished) return;
      if (this.session.isReadOnly()) {
        this.fail('forbidden');
        return;
      }
      this.generationId = 1;
      this.send({
        type: 'SYNCED',
        jobId: this.grant!.jobId,
        generationId: this.generationId,
      });
      const prepared =
        input.import !== undefined
          ? this.importScene(this.session, input.import)
          : this.prepare(this.session, input.operations!);
      if (this.finished) return;
      if (!prepared.ok) {
        this.fail('invalid');
        return;
      }
      if (this.remaining() <= 0) {
        this.fail('timeout-before-go');
        return;
      }
      this.prepared = prepared;
      this.send({
        type: 'PREPARED',
        jobId: this.grant!.jobId,
        generationId: this.generationId,
        updateDigest: createHash('sha256')
          .update(prepared.update)
          .digest('hex'),
        byteLength: prepared.update.length,
        summary: prepared.summary,
      });
    } catch (error) {
      this.fail(
        error instanceof ReadOnlyRoomError ||
          error instanceof DocumentPurgingError
          ? 'forbidden'
          : 'cancelled-before-go'
      );
    }
  }

  private async publish() {
    const prepared = this.prepared!;
    try {
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          if (attempt > 0) {
            this.session = this.open();
            await this.session.connect(this.remaining());
          }
          if (this.finished) return;
          if (this.remaining() <= 0)
            throw new Error('Executor deadline elapsed');
          if (this.session!.isReadOnly()) throw this.session!.readOnlyError();
          this.session!.resend(prepared.update);
          if (attempt === 0)
            this.send({
              type: 'PUBLISHED',
              jobId: this.grant!.jobId,
              generationId: this.generationId!,
            });
          await this.session!.requestDurability(this.remaining());
          if (this.finished) return;
          this.send({
            type: 'DURABLE',
            jobId: this.grant!.jobId,
            generationId: this.generationId!,
            result: {
              addedElementIds: prepared.addedElementIds,
              summary: prepared.summary,
            },
          });
          this.close();
          return;
        } catch (error) {
          if (this.finished) return;
          if (
            attempt === 2 ||
            this.remaining() <= 0 ||
            error instanceof ReadOnlyRoomError ||
            error instanceof DocumentPurgingError ||
            error instanceof UpdateRejectedError ||
            (error instanceof CollaborationSessionEndError &&
              error.disposition !== 'transient')
          )
            throw error;
        } finally {
          this.session?.close();
        }
      }
    } catch {
      this.fail('indeterminate-after-go');
    }
  }

  private fail(outcome: ExecutorOutcome, rejectedJobId?: string) {
    if (this.finished) return;
    const jobId = this.grant?.jobId ?? rejectedJobId;
    this.send({
      type: 'FAILED',
      ...(validId(jobId) ? { jobId } : {}),
      ...(this.generationId ? { generationId: this.generationId } : {}),
      typedOutcome: this.afterGo ? 'indeterminate-after-go' : outcome,
    });
    this.close();
  }
  private close() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.timer);
    this.session?.close();
    this.exit();
  }
}
