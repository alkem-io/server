import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAuditCategory } from './enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';
import { PlatformAuditEntry } from './platform.audit.entry.entity';
import {
  IPlatformAuditEntry,
  PlatformAuditDetails,
} from './platform.audit.entry.interface';

export interface AppendEmailChangeEntryInput {
  subjectUserId: string;
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  outcome: PlatformAuditOutcome;
  failureReason?: string;
  correlationId?: string;
  details?: PlatformAuditDetails;
}

export interface CursorPageArgs {
  after?: string;
  first?: number;
  before?: string;
  last?: number;
}

export interface CursorPagedAuditEntries {
  entries: PlatformAuditEntry[];
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

const EMAIL_CHANGE_CATEGORY = PlatformAuditCategory.EMAIL_CHANGE;

@Injectable()
export class PlatformAuditEntryRepository {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly repo: Repository<PlatformAuditEntry>
  ) {}

  public async appendEmailChangeEntry(
    input: AppendEmailChangeEntryInput
  ): Promise<IPlatformAuditEntry> {
    const entry = this.repo.create({
      category: EMAIL_CHANGE_CATEGORY,
      subjectUserId: input.subjectUserId,
      initiatorUserId: input.initiatorUserId,
      initiatorRole: input.initiatorRole,
      outcome: input.outcome,
      failureReason: input.failureReason,
      correlationId: input.correlationId,
      details: input.details,
    });
    return this.repo.save(entry);
  }

  public async findEmailChangeBySubjectPaged(
    subjectUserId: string,
    args: CursorPageArgs
  ): Promise<CursorPagedAuditEntries> {
    const limit = args.first ?? args.last ?? 25;
    const reverse = args.last !== undefined || args.before !== undefined;
    const cursorRowId = decodeCursor(args.after ?? args.before);

    const qb = this.repo
      .createQueryBuilder('entry')
      .where('entry."subjectUserId" = :subjectUserId', { subjectUserId })
      .andWhere('entry."category" = :category', {
        category: EMAIL_CHANGE_CATEGORY,
      })
      .orderBy('entry."rowId"', reverse ? 'ASC' : 'DESC')
      .take(limit + 1);

    if (cursorRowId !== undefined) {
      qb.andWhere(
        reverse
          ? 'entry."rowId" > :cursorRowId'
          : 'entry."rowId" < :cursorRowId',
        { cursorRowId }
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const entries = reverse ? [...slice].reverse() : slice;

    const total = await this.repo.count({
      where: { subjectUserId, category: EMAIL_CHANGE_CATEGORY },
    });

    const first = entries[0];
    const last = entries[entries.length - 1];
    return {
      entries,
      total,
      hasNextPage: reverse ? false : hasMore,
      hasPreviousPage: reverse ? hasMore : false,
      startCursor: first ? encodeCursor(first.rowId) : undefined,
      endCursor: last ? encodeCursor(last.rowId) : undefined,
    };
  }

  public async findLatestEmailChangeBySubject(
    subjectUserId: string
  ): Promise<PlatformAuditEntry | null> {
    return this.repo.findOne({
      where: { subjectUserId, category: EMAIL_CHANGE_CATEGORY },
      order: { rowId: 'DESC' },
    });
  }

  /**
   * Most recent `drift_detected` row for the subject that has no subsequent
   * `drift_resolved` row with a higher rowId. Required because a
   * `global_admin_notification_failed` row written after the drift entry would
   * shift the "latest entry" past it (tasks.md §T029).
   */
  public async findLatestUnresolvedDriftBySubject(
    subjectUserId: string
  ): Promise<PlatformAuditEntry | null> {
    const latestDrift = await this.repo.findOne({
      where: {
        subjectUserId,
        category: EMAIL_CHANGE_CATEGORY,
        outcome: PlatformAuditOutcome.DRIFT_DETECTED,
      },
      order: { rowId: 'DESC' },
    });
    if (!latestDrift) {
      return null;
    }
    const subsequentResolution = await this.repo.findOne({
      where: {
        subjectUserId,
        category: EMAIL_CHANGE_CATEGORY,
        outcome: PlatformAuditOutcome.DRIFT_RESOLVED,
      },
      order: { rowId: 'DESC' },
    });
    if (
      subsequentResolution &&
      subsequentResolution.rowId > latestDrift.rowId
    ) {
      return null;
    }
    return latestDrift;
  }
}

function encodeCursor(rowId: number): string {
  return Buffer.from(String(rowId), 'utf8').toString('base64');
}

function decodeCursor(cursor: string | undefined): number | undefined {
  if (!cursor) return undefined;
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const n = Number(decoded);
  return Number.isFinite(n) ? n : undefined;
}
