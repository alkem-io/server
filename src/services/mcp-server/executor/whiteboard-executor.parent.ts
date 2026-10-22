import { ChildProcess, fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { LogContext } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import type { SemanticOperation } from '@excalidraw-yjs/excalidraw/headless';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  ExecutionInput,
  ExecutorOutcome,
  ExecutorResult,
  ImportInput,
  ParentMessage,
  parseChildMessage,
  validId,
  validImport,
  validOperations,
} from './whiteboard-executor.protocol';

export function executorConfig(env: NodeJS.ProcessEnv) {
  if (env.MCP_WHITEBOARD_EXECUTOR_ENABLED !== 'true') return undefined;
  const integer = (key: string, minimum: number) => {
    const value = Number(env[key]);
    if (!Number.isSafeInteger(value) || value < minimum)
      throw new Error('Invalid whiteboard executor configuration');
    return value;
  };
  const n = integer(
    'MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN',
    env.NODE_ENV === 'production' ? 4 : 2
  );
  const p = integer(
    'MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR',
    1
  );
  return {
    n,
    p,
    a: Math.min(p, n - 1),
    heapMb: integer('MCP_WHITEBOARD_EXECUTOR_HEAP_MB', 1),
    deadlineMs: integer('MCP_WHITEBOARD_EXECUTOR_DEADLINE_MS', 1),
  };
}
export type JobOutcome = { outcome: ExecutorOutcome; result?: ExecutorResult };
export interface ImportPreparation {
  prepare(context: {
    signal: AbortSignal;
    deadlineAt: number;
    createdDocumentIDs: string[];
  }): Promise<ImportInput>;
  cleanup(createdDocumentIDs: string[]): Promise<void>;
}

@Injectable()
export class WhiteboardExecutorParent implements OnModuleDestroy {
  private readonly capacity = executorConfig(process.env);
  private readonly jobs = new Map<
    string,
    { actorId: string; stop: () => void }
  >();

  constructor(
    private readonly config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    if (this.capacity)
      this.logger.log(
        { message: 'Whiteboard executor capacity', ...this.capacity },
        LogContext.MCP_SERVER
      );
  }

  protected launch(): ChildProcess {
    return fork(join(__dirname, 'whiteboard-executor.entry.js'), [], {
      execPath: process.execPath,
      execArgv: [`--max-old-space-size=${this.capacity!.heapMb}`],
      env: {
        LANG: 'en_US.UTF-8',
        MCP_EXECUTOR_COLLAB_URL: this.config.getOrThrow<string>(
          'collaboration.service.url'
        ),
        MCP_EXECUTOR_ACTOR_HEADER: this.config.getOrThrow<string>(
          'collaboration.service.actor_id_header'
        ),
      },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
  }

  async execute(
    documentId: string,
    actorId: string,
    input: SemanticOperation[] | ExecutionInput,
    signal?: AbortSignal,
    preparation?: ImportPreparation
  ): Promise<JobOutcome> {
    let payload: ExecutionInput = Array.isArray(input)
      ? { operations: input }
      : input;
    if (
      !validId(documentId) ||
      !validId(actorId) ||
      !(
        payload &&
        (('import' in payload &&
          !('operations' in payload) &&
          validImport(payload.import)) ||
          ('operations' in payload &&
            !('import' in payload) &&
            validOperations(payload.operations)))
      ) ||
      (preparation && !('import' in payload))
    )
      return { outcome: 'invalid' };
    if (!this.capacity) return { outcome: 'unavailable' };
    if (signal?.aborted) return { outcome: 'cancelled-before-go' };
    const owned = [...this.jobs.values()].filter(
      job => job.actorId === actorId
    ).length;
    if (this.jobs.size >= this.capacity.n || owned >= this.capacity.a)
      return { outcome: 'busy' };
    const jobId = randomUUID();
    const deadline = Date.now() + this.capacity.deadlineMs;
    const controller = new AbortController();
    const createdDocumentIDs: string[] = [];
    let phase: 'preparing' | 'joining' | 'synced' | 'go' | 'published' =
      'preparing';
    const afterGo = () => phase === 'go' || phase === 'published';
    let stopped: ExecutorOutcome | undefined;
    let stopChild: ((outcome: ExecutorOutcome) => void) | undefined;
    const stop = (outcome: ExecutorOutcome) => {
      stopped ??= outcome;
      controller.abort();
      stopChild?.(outcome);
    };
    const cancel = () => {
      if (!afterGo()) stop('cancelled-before-go');
    };
    const timer = setTimeout(
      () => stop('timeout-before-go'),
      Math.max(1, deadline - Date.now())
    );
    // Admission covers bounded materialization, the child, and definite cleanup.
    this.jobs.set(jobId, { actorId, stop: () => stop('cancelled-before-go') });
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      if (signal?.aborted) cancel();
      if (preparation && !stopped) {
        try {
          payload = {
            import: await preparation.prepare({
              signal: controller.signal,
              deadlineAt: deadline,
              createdDocumentIDs,
            }),
          };
          if (!validImport(payload.import)) stop('invalid');
        } catch (error) {
          stop(
            stopped ??
              (error instanceof ForbiddenAuthorizationPolicyException ||
              error instanceof ForbiddenException
                ? 'forbidden'
                : 'invalid')
          );
        }
      }
      if (Date.now() >= deadline) stop('timeout-before-go');
      if (stopped) return { outcome: stopped };
      let child: ChildProcess;
      phase = 'joining';
      try {
        child = this.launch();
      } catch {
        return { outcome: 'resource-exhausted-before-go' };
      }

      return await new Promise<JobOutcome>(resolve => {
        let generationId: number | undefined;
        let terminal: JobOutcome | undefined;
        const abnormal = (before: ExecutorOutcome): JobOutcome => ({
          outcome: afterGo() ? 'indeterminate-after-go' : before,
        });
        const finish = (outcome: JobOutcome) => {
          if (terminal) return;
          terminal = outcome;
          child.kill('SIGKILL');
        };
        const send = (message: ParentMessage) => {
          try {
            child.send(message, error => {
              if (error) finish(abnormal('cancelled-before-go'));
            });
          } catch {
            finish(abnormal('cancelled-before-go'));
          }
        };
        stopChild = before => finish(abnormal(before));
        child.once('disconnect', () => finish(abnormal('cancelled-before-go')));
        child.on('message', raw => {
          if (terminal) return;
          const parsed = parseChildMessage(raw);
          const msg = parsed.data;
          if (
            !msg ||
            (msg.jobId !== undefined && msg.jobId !== jobId) ||
            (msg.generationId !== undefined &&
              generationId !== undefined &&
              msg.generationId !== generationId)
          ) {
            finish(abnormal('invalid'));
            return;
          }
          if (msg.type === 'FAILED') {
            if (
              (generationId !== undefined &&
                (msg.generationId !== generationId || msg.jobId !== jobId)) ||
              (generationId === undefined && msg.generationId !== undefined)
            )
              finish(abnormal('invalid'));
            else
              finish(
                afterGo()
                  ? { outcome: 'indeterminate-after-go' }
                  : {
                      outcome:
                        msg.typedOutcome === 'indeterminate-after-go'
                          ? 'invalid'
                          : msg.typedOutcome,
                    }
              );
            return;
          }
          if (msg.jobId !== jobId) {
            finish(abnormal('invalid'));
            return;
          }
          switch (msg.type) {
            case 'SYNCED':
              if (phase !== 'joining') {
                finish(abnormal('invalid'));
                return;
              }
              generationId = msg.generationId;
              phase = 'synced';
              break;
            case 'PREPARED':
              if (phase !== 'synced') {
                finish(abnormal('invalid'));
                return;
              }
              if (signal?.aborted) {
                cancel();
                return;
              }
              if (Date.now() >= deadline) {
                finish({ outcome: 'timeout-before-go' });
                return;
              }
              phase = 'go';
              send({ type: 'GO', jobId, generationId: msg.generationId });
              break;
            case 'PUBLISHED':
              if (phase !== 'go') {
                finish(abnormal('invalid'));
                return;
              }
              phase = 'published';
              break;
            case 'DURABLE':
              if (!afterGo()) {
                finish({ outcome: 'invalid' });
                return;
              }
              finish({ outcome: 'durable-success', result: msg.result });
              break;
          }
        });
        const cleanup = (code?: number | null) => {
          child.removeAllListeners();
          const outcome =
            terminal ??
            abnormal(
              code === 0
                ? 'cancelled-before-go'
                : 'resource-exhausted-before-go'
            );
          this.logger.log(
            {
              message: 'Whiteboard executor completed',
              jobId,
              phase,
              durationMs: Date.now() - (deadline - this.capacity!.deadlineMs),
              outcome: outcome.outcome,
            },
            LogContext.MCP_SERVER
          );
          resolve(outcome);
        };
        child.once('error', () => {
          finish(abnormal('resource-exhausted-before-go'));
          if (!child.pid) cleanup();
        });
        child.once('exit', cleanup);
        send({
          type: 'START',
          ...payload,
          childLaunchGrant: {
            jobId,
            documentId,
            actorId,
            deadline,
            intent: 'edit-whiteboard-elements',
          },
        });
        if (signal?.aborted) cancel();
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (!afterGo() && preparation && createdDocumentIDs.length) {
        try {
          await preparation.cleanup(createdDocumentIDs);
        } catch {
          this.logger.warn?.(
            { message: 'Whiteboard import media cleanup failed', jobId },
            LogContext.MCP_SERVER
          );
        }
      }
      this.jobs.delete(jobId);
    }
  }

  onModuleDestroy() {
    for (const job of this.jobs.values()) job.stop();
  }
}
