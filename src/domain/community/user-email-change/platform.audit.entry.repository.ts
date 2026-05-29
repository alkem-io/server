import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
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
const PASSWORD_CHANGE_CATEGORY = PlatformAuditCategory.PASSWORD_CHANGE;

export interface AppendPasswordChangeEntryInput {
  subjectUserId: string;
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  outcome: PlatformAuditOutcome;
  failureReason?: string;
  correlationId?: string;
  details?: PlatformAuditDetails;
}

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

  public async appendPasswordChangeEntry(
    input: AppendPasswordChangeEntryInput
  ): Promise<IPlatformAuditEntry> {
    const entry = this.repo.create({
      category: PASSWORD_CHANGE_CATEGORY,
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

  public async findPasswordChangeBySubjectPaged(
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
        category: PASSWORD_CHANGE_CATEGORY,
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
      where: {
        subjectUserId,
        category: PASSWORD_CHANGE_CATEGORY,
      },
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

  public async findLatestPasswordChangeBySubject(
    subjectUserId: string
  ): Promise<PlatformAuditEntry | null> {
    return this.repo.findOne({
      where: {
        subjectUserId,
        category: PASSWORD_CHANGE_CATEGORY,
      },
      order: { rowId: 'DESC' },
    });
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
      // `commit_started` is the internal crash-window breadcrumb (research.md
      // §R15) — never surface it on the GraphQL audit-history projection.
      .andWhere('entry."outcome" != :excludedOutcome', {
        excludedOutcome: PlatformAuditOutcome.COMMIT_STARTED,
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
      where: {
        subjectUserId,
        category: EMAIL_CHANGE_CATEGORY,
        outcome: Not(PlatformAuditOutcome.COMMIT_STARTED),
      },
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

  /**
   * Most recent email-change audit row for the subject, projected to the GraphQL
   * `latestUserEmailChangeAuditEntry` field. Excludes the internal `commit_started`
   * breadcrumb (research.md §R15) so the admin-facing "latest outcome" is always a
   * real outcome, never plumbing.
   */
  public async findLatestEmailChangeBySubject(
    subjectUserId: string
  ): Promise<PlatformAuditEntry | null> {
    return this.repo.findOne({
      where: {
        subjectUserId,
        category: EMAIL_CHANGE_CATEGORY,
        outcome: Not(PlatformAuditOutcome.COMMIT_STARTED),
      },
      order: { rowId: 'DESC' },
    });
  }

  /**
   * The latest *outstanding* email-change operation for the subject — the row the
   * `adminUserEmailChangeDriftResolve` mutation reconciles.
   *
   * A candidate row is one with outcome `commit_started` or `drift_detected`:
   *
   * - `drift_detected` — the classic drift case (research.md §R6): the forward
   *   Kratos write succeeded, the Alkemio write failed, and the compensating Kratos
   *   revert exhausted its retry budget.
   * - `commit_started` — the crash-window breadcrumb (research.md §R15): the
   *   process died somewhere inside `commitAcrossSides`, so no terminal row was
   *   ever written. The two sides may or may not actually diverge; `resolveDrift`
   *   reads both and aligns them.
   *
   * A candidate is OUTSTANDING when BOTH hold:
   *   (1) no `rolled_back` row shares its `correlationId` — a clean rollback of
   *       that same operation means nothing is outstanding; and
   *   (2) no later `committed` / `drift_resolved` row exists for the subject (a
   *       higher `rowId`) — a subsequent operation that drove both sides to a
   *       known-consistent state heals any earlier crash breadcrumb. This is the
   *       common recovery path: an admin retries a crashed change, the retry
   *       commits, and the stale breadcrumb is correctly treated as moot.
   *
   * Evaluation is per-operation (keyed on `correlationId` / `rowId`), so a later
   * attempt cannot mask an earlier genuinely-unresolved one, and a normal completed
   * change is excluded.
   */
  public async findLatestUnresolvedDriftBySubject(
    subjectUserId: string
  ): Promise<PlatformAuditEntry | null> {
    return this.repo
      .createQueryBuilder('entry')
      .where('entry."subjectUserId" = :subjectUserId', { subjectUserId })
      .andWhere('entry."category" = :category', {
        category: EMAIL_CHANGE_CATEGORY,
      })
      .andWhere('entry."correlationId" IS NOT NULL')
      .andWhere('entry."outcome" IN (:...candidateOutcomes)', {
        candidateOutcomes: [
          PlatformAuditOutcome.COMMIT_STARTED,
          PlatformAuditOutcome.DRIFT_DETECTED,
        ],
      })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "platform_audit_entry" "rolledBack"
          WHERE "rolledBack"."correlationId" = entry."correlationId"
            AND "rolledBack"."category" = :category
            AND "rolledBack"."outcome" = :rolledBackOutcome
        )`,
        { rolledBackOutcome: PlatformAuditOutcome.ROLLED_BACK }
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "platform_audit_entry" "healed"
          WHERE "healed"."subjectUserId" = entry."subjectUserId"
            AND "healed"."category" = :category
            AND "healed"."outcome" IN (:...healingOutcomes)
            AND "healed"."rowId" > entry."rowId"
        )`,
        {
          healingOutcomes: [
            PlatformAuditOutcome.COMMITTED,
            PlatformAuditOutcome.DRIFT_RESOLVED,
          ],
        }
      )
      .orderBy('entry."rowId"', 'DESC')
      .getOne();
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
