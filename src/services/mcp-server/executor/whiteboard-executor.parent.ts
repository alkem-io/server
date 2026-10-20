import { ChildProcess, fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { LogContext } from '@common/enums';
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
  ExecutorOutcome,
  ExecutorResult,
  ParentMessage,
  parseChildMessage,
  validId,
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
    operations: SemanticOperation[],
    signal?: AbortSignal
  ): Promise<JobOutcome> {
    if (
      !validId(documentId) ||
      !validId(actorId) ||
      !validOperations(operations)
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
    // Both limits reserve the same record synchronously, before the first spawn.
    this.jobs.set(jobId, { actorId, stop: () => {} });
    let child: ChildProcess;
    try {
      child = this.launch();
    } catch {
      this.jobs.delete(jobId);
      return { outcome: 'resource-exhausted-before-go' };
    }

    return new Promise(resolve => {
      let phase: 'joining' | 'synced' | 'go' | 'published' = 'joining';
      let generationId: number | undefined;
      let terminal: JobOutcome | undefined;
      const afterGo = () => phase === 'go' || phase === 'published';
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
      const cancel = () => {
        if (!afterGo()) finish({ outcome: 'cancelled-before-go' });
      };
      const timer = setTimeout(
        () => finish(abnormal('timeout-before-go')),
        Math.max(1, deadline - Date.now())
      );
      this.jobs.set(jobId, {
        actorId,
        stop: () => finish(abnormal('cancelled-before-go')),
      });
      signal?.addEventListener('abort', cancel, { once: true });
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
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        child.removeAllListeners();
        this.jobs.delete(jobId);
        const outcome =
          terminal ??
          abnormal(
            code === 0 ? 'cancelled-before-go' : 'resource-exhausted-before-go'
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
        operations,
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
  }

  onModuleDestroy() {
    for (const job of this.jobs.values()) job.stop();
  }
}
