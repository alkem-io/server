import type { MemoPdfImageOutcome } from './memo.pdf.render.core';

/**
 * Messages between the memo PDF executor (parent) and one render worker
 * (child). The channel uses Node's `advanced` serialization, so Buffers cross
 * as binary. Every message carries the job id; anything that does not parse is
 * treated by the receiver as a protocol failure.
 */
export type ParentMessage =
  | { type: 'START'; jobId: string; state: Buffer }
  | {
      type: 'IMAGE';
      jobId: string;
      index: number;
      outcome: MemoPdfImageOutcome;
    };

export type ChildMessage =
  | { type: 'RESOLVE_IMAGE'; jobId: string; index: number; src: string }
  | { type: 'DONE'; jobId: string; pdf: Buffer; imageCount: number }
  | {
      type: 'FAILED';
      jobId: string;
      kind: 'invalid' | 'crashed';
      message: string;
    };

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJobId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isIndex = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

const isDimension = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;

const isImageOutcome = (value: unknown): value is MemoPdfImageOutcome => {
  if (!isRecord(value)) return false;
  if (value.kind === 'link') return true;
  return (
    value.kind === 'data' &&
    Buffer.isBuffer(value.jpeg) &&
    isDimension(value.width) &&
    isDimension(value.height)
  );
};

export const parseParentMessage = (raw: unknown): ParentMessage | undefined => {
  if (!isRecord(raw) || !isJobId(raw.jobId)) return undefined;
  switch (raw.type) {
    case 'START':
      return Buffer.isBuffer(raw.state)
        ? { type: 'START', jobId: raw.jobId, state: raw.state }
        : undefined;
    case 'IMAGE':
      return isIndex(raw.index) && isImageOutcome(raw.outcome)
        ? {
            type: 'IMAGE',
            jobId: raw.jobId,
            index: raw.index,
            outcome: raw.outcome,
          }
        : undefined;
    default:
      return undefined;
  }
};

export const parseChildMessage = (raw: unknown): ChildMessage | undefined => {
  if (!isRecord(raw) || !isJobId(raw.jobId)) return undefined;
  switch (raw.type) {
    case 'RESOLVE_IMAGE':
      return isIndex(raw.index) && typeof raw.src === 'string'
        ? {
            type: 'RESOLVE_IMAGE',
            jobId: raw.jobId,
            index: raw.index,
            src: raw.src,
          }
        : undefined;
    case 'DONE':
      return Buffer.isBuffer(raw.pdf) && isIndex(raw.imageCount)
        ? {
            type: 'DONE',
            jobId: raw.jobId,
            pdf: raw.pdf,
            imageCount: raw.imageCount,
          }
        : undefined;
    case 'FAILED':
      return (raw.kind === 'invalid' || raw.kind === 'crashed') &&
        typeof raw.message === 'string'
        ? {
            type: 'FAILED',
            jobId: raw.jobId,
            kind: raw.kind,
            message: raw.message,
          }
        : undefined;
    default:
      return undefined;
  }
};
