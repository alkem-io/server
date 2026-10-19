import { ChildProcess, fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { LogContext } from '@common/enums/logging.context';
import {
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ParentMessage, parseChildMessage } from './memo.pdf.executor.protocol';
import type { ResolveMemoImage } from './memo.pdf.render.core';

export type MemoPdfExecutorCapacity = {
  maxConcurrent: number;
  /**
   * Downloads may use every slot but one, so that a signing preview always
   * finds capacity however many readers download. With a single slot there is
   * nothing to reserve and both share it.
   */
  maxConcurrentDownloads: number;
  maxPerActor: number;
  heapMb: number;
  deadlineMs: number;
};

type PdfExportConfig = AlkemioConfig['collaboration']['memo']['pdf_export'];

const DEFAULTS: PdfExportConfig = {
  max_concurrent_renders: 2,
  max_concurrent_renders_per_actor: 1,
  heap_mb: 512,
  deadline_ms: 30_000,
};

/**
 * Reads the render limits once. A value that is not a safe integer in range
 * falls back to its default and is reported through `warn` with its key, so a
 * mistyped environment variable degrades to the documented limits instead of
 * an unbounded or zero-heap worker.
 */
export function memoPdfExecutorCapacity(
  raw: Partial<Record<keyof PdfExportConfig, unknown>> | undefined,
  warn: (key: keyof PdfExportConfig) => void
): MemoPdfExecutorCapacity {
  const read = (key: keyof PdfExportConfig, minimum: number) => {
    const value = raw?.[key];
    if (Number.isSafeInteger(value) && (value as number) >= minimum)
      return value as number;
    warn(key);
    return DEFAULTS[key];
  };
  const maxConcurrent = read('max_concurrent_renders', 0);
  return {
    maxConcurrent,
    maxConcurrentDownloads:
      maxConcurrent > 1 ? maxConcurrent - 1 : maxConcurrent,
    maxPerActor: read('max_concurrent_renders_per_actor', 0),
    heapMb: read('heap_mb', 1),
    deadlineMs: read('deadline_ms', 1),
  };
}

/**
 * Why a render runs. The signing preview is part of a paid, entitlement-gated
 * flow; a download is open to every reader, so downloads alone can never fill
 * the instance's capacity.
 */
export type MemoPdfRenderPurpose = 'download' | 'signing';

export type MemoPdfRenderJob = {
  purpose: MemoPdfRenderPurpose;
  state: Buffer;
  resolveImage: ResolveMemoImage;
  actorId: string;
  memoId?: string;
  signal?: AbortSignal;
};

type Outcome =
  | 'ok'
  | 'invalid'
  | 'busy-actor'
  | 'busy-global'
  | 'deadline'
  | 'crashed'
  | 'launch-failed'
  | 'cancelled';

type Terminal = { outcome: Outcome; pdf?: Buffer; error?: unknown };

const cancelled = () => new Error('Memo PDF render cancelled');

const isRenderInputFailure = (error: unknown) =>
  error instanceof ValidationException ||
  error instanceof ForbiddenException ||
  error instanceof ForbiddenAuthorizationPolicyException;

/**
 * Runs every memo PDF render in its own forked worker process, so layout work
 * never blocks the server's event loop and a pathological memo can only exhaust
 * its worker's heap. Bounds concurrency globally and per actor, enforces one
 * deadline per render, and kills the worker when the requester goes away.
 * Images are resolved here, in the main process, on the worker's request.
 */
@Injectable()
export class MemoPdfExecutor implements OnModuleDestroy {
  private readonly capacity: MemoPdfExecutorCapacity;
  private readonly jobs = new Map<
    string,
    { actorId: string; purpose: MemoPdfRenderPurpose; stop: () => void }
  >();

  constructor(
    config: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.capacity = memoPdfExecutorCapacity(
      config.get('collaboration.memo.pdf_export', { infer: true }),
      key =>
        this.logger.warn?.(
          {
            message: 'Invalid memo PDF export setting; using the default',
            key,
            default: DEFAULTS[key],
          },
          LogContext.MEMOS
        )
    );
  }

  protected launch(): ChildProcess {
    return fork(join(__dirname, 'memo.pdf.executor.entry.js'), [], {
      execPath: process.execPath,
      execArgv: [`--max-old-space-size=${this.capacity.heapMb}`],
      env: { LANG: 'en_US.UTF-8' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      serialization: 'advanced',
    });
  }

  async run(job: MemoPdfRenderJob): Promise<Buffer> {
    const jobId = randomUUID();
    const reservedAt = Date.now();
    const record = (terminal: Terminal, imageCount?: number) =>
      this.logOutcome(
        job,
        jobId,
        Date.now() - reservedAt,
        terminal,
        imageCount
      );
    // Refusals before any worker exists are logged with a zero duration.
    const refuse = (outcome: Outcome) =>
      this.logOutcome(job, jobId, 0, { outcome });

    if (job.signal?.aborted) {
      refuse('cancelled');
      throw cancelled();
    }
    const running = [...this.jobs.values()];
    if (
      running.length >= this.capacity.maxConcurrent ||
      (job.purpose === 'download' &&
        running.filter(other => other.purpose === 'download').length >=
          this.capacity.maxConcurrentDownloads)
    ) {
      refuse('busy-global');
      throw new MemoPdfUnavailableException('busy-global');
    }
    const owned = running.filter(other => other.actorId === job.actorId).length;
    if (owned >= this.capacity.maxPerActor) {
      refuse('busy-actor');
      throw new MemoPdfUnavailableException('busy-actor');
    }

    // The slot is reserved synchronously, before the fork, so concurrent
    // requests can never both pass the capacity checks above.
    this.jobs.set(jobId, {
      actorId: job.actorId,
      purpose: job.purpose,
      stop: () => {},
    });
    let child: ChildProcess;
    try {
      child = this.launch();
    } catch {
      this.jobs.delete(jobId);
      refuse('launch-failed');
      throw new MemoPdfUnavailableException('launch-failed');
    }

    return new Promise<Buffer>((resolve, reject) => {
      let terminal: Terminal | undefined;
      let imageCount: number | undefined;
      let expectedIndex = 0;
      let resolvingImage = false;
      let cleanedUp = false;

      const finish = (outcome: Terminal) => {
        if (terminal) return;
        terminal = outcome;
        child.kill('SIGKILL');
      };
      const send = (message: ParentMessage) => {
        try {
          child.send(message, error => {
            if (error) finish({ outcome: 'crashed' });
          });
        } catch {
          finish({ outcome: 'crashed' });
        }
      };
      const onAbort = () => finish({ outcome: 'cancelled' });
      const timer = setTimeout(
        () => finish({ outcome: 'deadline' }),
        Math.max(1, reservedAt + this.capacity.deadlineMs - Date.now())
      );

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearTimeout(timer);
        job.signal?.removeEventListener('abort', onAbort);
        child.removeAllListeners();
        this.jobs.delete(jobId);
        const outcome = terminal ?? { outcome: 'crashed' };
        record(outcome, imageCount);
        if (outcome.outcome === 'ok' && outcome.pdf) resolve(outcome.pdf);
        else reject(this.errorFor(outcome));
      };

      this.jobs.set(jobId, {
        actorId: job.actorId,
        purpose: job.purpose,
        stop: () => finish({ outcome: 'cancelled' }),
      });
      job.signal?.addEventListener('abort', onAbort, { once: true });

      child.on('message', raw => {
        if (terminal) return;
        const message = parseChildMessage(raw);
        if (!message || message.jobId !== jobId)
          return finish({ outcome: 'crashed' });
        switch (message.type) {
          case 'RESOLVE_IMAGE': {
            if (resolvingImage || message.index !== expectedIndex)
              return finish({ outcome: 'crashed' });
            resolvingImage = true;
            const { index, src } = message;
            job.resolveImage(src, index).then(
              outcome => {
                if (terminal) return;
                resolvingImage = false;
                expectedIndex++;
                send({ type: 'IMAGE', jobId, index, outcome });
              },
              error =>
                finish({
                  outcome: isRenderInputFailure(error) ? 'invalid' : 'crashed',
                  error,
                })
            );
            return;
          }
          case 'DONE':
            imageCount = message.imageCount;
            return finish({ outcome: 'ok', pdf: message.pdf });
          case 'FAILED':
            return finish(
              message.kind === 'invalid'
                ? {
                    outcome: 'invalid',
                    error: new ValidationException(
                      message.message,
                      LogContext.MEMOS
                    ),
                  }
                : { outcome: 'crashed' }
            );
        }
      });
      child.once('error', () => {
        finish({ outcome: child.pid ? 'crashed' : 'launch-failed' });
        if (!child.pid) cleanup();
      });
      child.once('exit', cleanup);

      send({ type: 'START', jobId, state: job.state });
      if (job.signal?.aborted) onAbort();
    });
  }

  onModuleDestroy() {
    for (const job of this.jobs.values()) job.stop();
  }

  private errorFor(terminal: Terminal): unknown {
    switch (terminal.outcome) {
      case 'invalid':
        return terminal.error;
      case 'cancelled':
        return cancelled();
      case 'crashed':
        // A resolver failure that is not about the memo's content (e.g. the
        // file service is down) is surfaced unchanged, as the in-process
        // renderer did.
        return terminal.error ?? new MemoPdfUnavailableException('crashed');
      default:
        return new MemoPdfUnavailableException(
          terminal.outcome as 'deadline' | 'launch-failed'
        );
    }
  }

  private logOutcome(
    job: MemoPdfRenderJob,
    jobId: string,
    durationMs: number,
    terminal: Terminal,
    imageCount?: number
  ) {
    const line = {
      message: 'Memo PDF render completed',
      jobId,
      memoId: job.memoId,
      actorId: job.actorId,
      purpose: job.purpose,
      outcome: terminal.outcome,
      durationMs,
      pdfBytes: terminal.pdf?.length,
      imageCount,
    };
    switch (terminal.outcome) {
      case 'ok':
        return this.logger.log(line, LogContext.MEMOS);
      case 'crashed':
      case 'launch-failed':
        return this.logger.error(line, undefined, LogContext.MEMOS);
      default:
        return this.logger.warn?.(line, LogContext.MEMOS);
    }
  }
}
