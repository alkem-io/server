import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { classifyAdapterError } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import {
  LEGACY_UNVERIFIED_READINESS,
  RoomReadinessReason,
  RoomReadinessRecord,
  RoomReadinessState,
} from './dto/room.readiness';
import { IRoom } from './room.interface';
import {
  ROOM_READINESS_CHANGED_EVENT,
  RoomReadinessChangedEvent,
} from './room.readiness.changed.event';

/**
 * Who is writing readiness. The transition table below is keyed on it:
 * - PROVISIONING: the synchronous outcome of asking the adapter to create the
 *   room (or the pre-assigned external creation) — the only writer allowed to
 *   set a room's very first readiness.
 * - BACKEND_CONFIRMATION: the first backend-originated event referencing a
 *   pending room (room created, member join, message received, room updated).
 * - PROBE: a verification that asked the backend whether the room exists —
 *   the reconciliation sweep or a member-triggered repair. The only writer
 *   that may revoke READY, and only because the room is gone.
 */
export type RoomReadinessSource =
  | 'PROVISIONING'
  | 'BACKEND_CONFIRMATION'
  | 'PROBE';

export type RoomReadinessWrite = {
  state: RoomReadinessState;
  reason: RoomReadinessReason;
  detail?: string;
};

export type RoomReadinessWriteResult = {
  /** false when the transition was illegal and nothing was written */
  applied: boolean;
  /** true when the state or the reason differs from the previous record */
  changed: boolean;
  record: RoomReadinessRecord;
};

const MAX_DETAIL_LENGTH = 200;

/**
 * Readiness reason and member-visible sentence for a failed adapter call.
 * The sentence never carries the adapter payload; diagnostics go to the log.
 */
export const describeAdapterFailure = (
  error: unknown
): { reason: RoomReadinessReason; detail: string } => {
  switch (classifyAdapterError(error)) {
    case 'TIMEOUT':
      return {
        reason: RoomReadinessReason.ADAPTER_TIMEOUT,
        detail: 'The messaging backend did not answer within the timeout.',
      };
    case 'TRANSPORT':
      return {
        reason: RoomReadinessReason.ADAPTER_UNAVAILABLE,
        detail: 'The messaging backend could not be reached.',
      };
    case 'NOT_FOUND':
    case 'NOT_ALLOWED':
    case 'INVALID_PARAM':
    case 'REJECTED':
      return {
        reason: RoomReadinessReason.ADAPTER_REJECTED,
        detail: 'The messaging backend rejected the room operation.',
      };
    default:
      return {
        reason: RoomReadinessReason.UNKNOWN,
        detail: 'The messaging backend operation failed for an unknown reason.',
      };
  }
};

@Injectable()
export class RoomReadinessService {
  constructor(
    private readonly roomLookupService: RoomLookupService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Record a readiness outcome. Illegal transitions are ignored with a warning
   * and never thrown: readiness is written from paths (provisioning failure
   * handling, inbound event handlers, background probes) where a throw would
   * turn a bookkeeping problem into a user-visible or pipeline failure.
   */
  async record(
    room: IRoom,
    write: RoomReadinessWrite,
    source: RoomReadinessSource
  ): Promise<RoomReadinessWriteResult> {
    const previous = room.readiness;

    if (!this.isTransitionAllowed(previous, write, source)) {
      this.logger.warn?.(
        `Ignoring illegal readiness transition for room ${room.id}: ${previous?.state ?? 'none'}/${previous?.reason ?? 'none'} -> ${write.state}/${write.reason} by ${source}`,
        LogContext.COMMUNICATION
      );
      return {
        applied: false,
        changed: false,
        record: previous ?? this.legacyRecord(),
      };
    }

    const detail = this.sanitizeDetail(write.detail);
    const record: RoomReadinessRecord = {
      state: write.state,
      reason: write.reason,
      ...(detail ? { detail } : {}),
      updatedAt: new Date().toISOString(),
    };

    await this.roomLookupService.updatePartial(room.id, { readiness: record });
    room.readiness = record;

    const changed =
      previous?.state !== record.state || previous?.reason !== record.reason;

    if (changed) {
      this.logger.verbose?.(
        `Room ${room.id} readiness ${previous?.state ?? 'none'} -> ${record.state}/${record.reason} (${source})`,
        LogContext.COMMUNICATION
      );
      try {
        await this.eventEmitter.emitAsync(
          ROOM_READINESS_CHANGED_EVENT,
          new RoomReadinessChangedEvent(room, previous, record, source)
        );
      } catch (error: any) {
        // Listeners publish governance events; a publish failure must not undo
        // a readiness write that is already persisted.
        this.logger.error?.(
          `Readiness change listener failed for room ${room.id}: ${error?.message}`,
          error?.stack,
          LogContext.COMMUNICATION
        );
      }
    }

    return { applied: true, changed, record };
  }

  /**
   * Transition table:
   *   (none | UNKNOWN) → READY | FAILED | PENDING  by PROVISIONING (creation)
   *   UNKNOWN  → READY                           by PROBE or BACKEND_CONFIRMATION
   *   UNKNOWN  → FAILED                          by PROBE
   *   PENDING  → READY                           by PROBE or BACKEND_CONFIRMATION
   *   PENDING  → FAILED                          by PROBE
   *   FAILED   → READY | FAILED                  by PROBE
   *   READY    → READY                           by PROBE or BACKEND_CONFIRMATION (reason refresh)
   *   READY    → FAILED (ROOM_MISSING only)      by PROBE
   *   *        → PENDING | UNKNOWN               never (after creation)
   */
  isTransitionAllowed(
    previous: RoomReadinessRecord | undefined,
    write: RoomReadinessWrite,
    source: RoomReadinessSource
  ): boolean {
    if (!previous || previous.state === RoomReadinessState.UNKNOWN) {
      // A freshly saved row may read back the column default before its
      // provisioning outcome is recorded, so creation is "no record or the
      // legacy marker".
      if (source === 'PROVISIONING') {
        return write.state !== RoomReadinessState.UNKNOWN;
      }
    }
    if (source === 'PROVISIONING') {
      // Provisioning writes exactly once, at creation.
      return false;
    }
    if (!previous) {
      return false;
    }
    if (
      write.state === RoomReadinessState.PENDING ||
      write.state === RoomReadinessState.UNKNOWN
    ) {
      return false;
    }

    switch (previous.state) {
      case RoomReadinessState.UNKNOWN:
      case RoomReadinessState.PENDING:
        if (write.state === RoomReadinessState.READY) return true;
        return write.state === RoomReadinessState.FAILED && source === 'PROBE';
      case RoomReadinessState.FAILED:
        return source === 'PROBE';
      case RoomReadinessState.READY:
        if (write.state === RoomReadinessState.READY) return true;
        return (
          source === 'PROBE' &&
          write.reason === RoomReadinessReason.ROOM_MISSING
        );
      default:
        return false;
    }
  }

  /**
   * Member-visible detail: reason class plus one sentence, never a raw
   * backend payload. Strips backend room ids, backend user ids, media URIs,
   * URLs and hostnames, and stack frames; bounded to 200 characters.
   */
  sanitizeDetail(detail: string | undefined): string | undefined {
    if (!detail) return undefined;
    const withoutFrames = detail
      .split(/\r?\n/)
      .filter(line => !/^\s*at\s+\S/.test(line))
      .join(' ');
    const redacted = withoutFrames
      .replace(/mxc:\/\/\S+/gi, '[redacted]')
      .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[redacted]')
      .replace(/[!#@][^\s:!#@]+:[^\s]+/g, '[redacted]')
      .replace(
        /\b(?:[a-z0-9-]+\.)+(?:[a-z]{2,}|localhost)(?::\d+)?\b/gi,
        '[redacted]'
      )
      .replace(/\s+/g, ' ')
      .trim();
    if (!redacted) return undefined;
    return redacted.length > MAX_DETAIL_LENGTH
      ? `${redacted.slice(0, MAX_DETAIL_LENGTH - 1)}…`
      : redacted;
  }

  private legacyRecord(): RoomReadinessRecord {
    return { ...LEGACY_UNVERIFIED_READINESS };
  }
}
