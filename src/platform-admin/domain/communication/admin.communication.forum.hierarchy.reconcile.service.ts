import {
  ErrCodeSpaceNotFound,
  SetChildrenResponse,
} from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { getForumCategoryContextId } from '@constants/forum.constants';
import { TaskStatus } from '@domain/task/dto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { TaskService } from '@services/task';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { AdminCommunicationReconcileForumHierarchyInput } from './dto/admin.communication.dto.reconcile.forum.hierarchy';

/** Per-parent bookkeeping for one reconcile invocation — keyed by context id so a
 * parent touched by both the add-only and the converge phase is counted once. */
interface ParentOutcome {
  failed: boolean;
}

export interface ForumHierarchyReconcilePassSummary {
  scanned: number;
  drifted: number;
  repaired: number;
  unresolved: number;
  failed: number;
  unknownKept: number;
  parentPointersDeferred: number;
  aborted: 'circuit-breaker' | 'budget-exhausted' | null;
  adapterDisabled: boolean;
}

/**
 * The disabled sentinel carries no `success` field at all — it is
 * deliberately not shaped like a BaseResponse, so it can never be mistaken
 * for one.
 */
const isDisabledSentinel = (
  response: SetChildrenResponse | { disabled: true } | undefined
): response is { disabled: true } =>
  response !== undefined && 'disabled' in response;

/**
 * Every error path on the wire (including the expected SPACE_NOT_FOUND
 * skip) marshals the response array fields as JSON `null`, never `[]` — the
 * Go side only empties them on the success branch. `CommunicationAdapter`
 * already normalizes at the wire boundary, but this second, cheap
 * normalization at the point of use means no accounting below can ever
 * dereference a null array regardless of what the adapter wrapper returns.
 */
const normalizeArrays = (
  response: SetChildrenResponse
): SetChildrenResponse => ({
  ...response,
  added: response.added ?? [],
  removed: response.removed ?? [],
  pruned_unknown: response.pruned_unknown ?? [],
  unknown_kept: response.unknown_kept ?? [],
  unresolved: response.unresolved ?? [],
  parent_pointers_repaired: response.parent_pointers_repaired ?? [],
  parent_pointers_deferred: response.parent_pointers_deferred ?? [],
});

const emptySummary = (): ForumHierarchyReconcilePassSummary => ({
  scanned: 0,
  drifted: 0,
  repaired: 0,
  unresolved: 0,
  failed: 0,
  unknownKept: 0,
  parentPointersDeferred: 0,
  aborted: null,
  adapterDisabled: false,
});

/**
 * Used only on the unexpected-throw path (see the top-level try/catch in
 * `reconcile`). `failed: 1` is a deliberate sentinel — an audit row for a
 * pass that never got to compute a real summary must never derive
 * `outcome: 'success'` from an all-zero summary.
 */
const erroredSummary = (): ForumHierarchyReconcilePassSummary => ({
  ...emptySummary(),
  failed: 1,
});

/**
 * Report-first, audited convergence of the Matrix space hierarchy that
 * mirrors the forum onto the current forum/discussion state in Postgres.
 *
 * No cursor, no persisted sync-state, no scheduler: desired state is always
 * recomputable from the DB, and a re-invocation is the only compensation a
 * partial pass ever gets. Every count in the audit row and task result comes
 * from the adapter's response arrays, never from how many times a loop ran —
 * a disabled or unreachable adapter must never be able to look like a clean
 * pass.
 */
@Injectable()
export class AdminCommunicationForumHierarchyReconcileService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    @InjectRepository(Forum)
    private forumRepository: Repository<Forum>,
    private taskService: TaskService,
    private platformOperationsAuditService: PlatformOperationsAuditService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Run one reconcile pass and settle the given task. Intended to be kicked
   * off fire-and-forget from the resolver — this method owns the task's
   * entire lifecycle from here (results, completion, the one audit row).
   */
  async reconcile(
    taskId: string,
    actorID: string,
    input: AdminCommunicationReconcileForumHierarchyInput
  ): Promise<void> {
    try {
      await this.runReconcilePass(taskId, actorID, input);
    } catch (error) {
      // Nothing above this line may ever throw out of the fire-and-forget
      // call site in the resolver: an uncaught rejection here would leave
      // the task IN_PROGRESS forever, write no audit row, and — with no
      // process-level unhandledRejection handler registered — take the pod
      // down. Every await below is individually guarded so a second
      // failure (e.g. the task store itself being down) can never escape
      // this catch either.
      this.logger.error?.(
        `Forum hierarchy reconcile pass threw: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );

      await this.recordAudit(actorID, taskId, input, erroredSummary());

      try {
        await this.taskService.completeWithError(
          taskId,
          `Forum hierarchy reconcile pass failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } catch (settleError) {
        this.logger.error?.(
          'Failed to settle task after a forum hierarchy reconcile pass threw',
          settleError instanceof Error ? settleError.stack : undefined,
          LogContext.COMMUNICATION
        );
      }
    }
  }

  private async runReconcilePass(
    taskId: string,
    actorID: string,
    input: AdminCommunicationReconcileForumHierarchyInput
  ): Promise<void> {
    const forums = await this.forumRepository.find({
      relations: { discussions: { comments: true } },
    });
    const forum = forums[0];

    if (!forum) {
      await this.recordAudit(actorID, taskId, input, emptySummary());
      await this.taskService.completeWithError(
        taskId,
        'No forum found to reconcile'
      );
      return;
    }

    const desiredByCategory = this.buildDesiredByCategory(forum);
    const categoryContextIds = Object.values(ForumDiscussionCategory).map(
      category => getForumCategoryContextId(forum.id, category)
    );
    // +1 for the forum-level parent itself.
    const totalIntendedParents = categoryContextIds.length + 1;

    const outcomes = new Map<string, ParentOutcome>();
    let drifted = 0;
    let repaired = 0;
    let unresolvedCount = 0;
    let unknownKeptCount = 0;
    let parentPointersDeferredCount = 0;
    let consecutiveTimeouts = 0;
    let cumulativeWrites = 0;
    let aborted: 'circuit-breaker' | 'budget-exhausted' | null = null;
    let adapterDisabled = false;

    // Per-sweep call accounting (data-model.md: "failed = calls with
    // success=false + calls never made after a breaker/budget abort").
    // Reset at the start of every `runSweep` invocation and folded into
    // `callBasedFailed` at the end of that same invocation, so a sweep that
    // is entirely skipped (e.g. phase B never starts because phase A
    // itself aborted) contributes nothing, while a sweep that starts and
    // is cut short mid-way honestly counts every call it never got to make.
    let sweepIssued = 0;
    let sweepExplicitFailures = 0;
    let callBasedFailed = 0;

    const isAborted = () => aborted !== null || adapterDisabled;
    const markFailed = (parentContextId: string) => {
      outcomes.set(parentContextId, { failed: true });
      sweepExplicitFailures++;
    };
    const markAttempted = (parentContextId: string) => {
      if (!outcomes.has(parentContextId)) {
        outcomes.set(parentContextId, { failed: false });
      }
    };

    const attempt = async (
      parentContextId: string,
      desired: string[],
      childrenAreSpaces: boolean,
      applyRemovals: boolean,
      passDryRun: boolean
    ): Promise<SetChildrenResponse | undefined> => {
      if (isAborted()) return undefined;

      sweepIssued++;
      const rawResponse = await this.communicationAdapter.setChildren({
        parent_context_id: parentContextId,
        desired_child_context_ids: desired,
        children_are_spaces: childrenAreSpaces,
        apply_removals: applyRemovals,
        prune_unknown: input.pruneUnknown,
        sync_child_parent: input.repairRoomParentPointers,
        dry_run: passDryRun,
      });

      // The disabled sentinel carries no `success` field at all — it is
      // deliberately not shaped like a BaseResponse, so it can never be
      // mistaken for one.
      if (isDisabledSentinel(rawResponse)) {
        adapterDisabled = true;
        markFailed(parentContextId);
        return undefined;
      }

      if (rawResponse === undefined) {
        consecutiveTimeouts++;
        markFailed(parentContextId);
        if (consecutiveTimeouts >= 3) {
          aborted = 'circuit-breaker';
        }
        return undefined;
      }

      const response = normalizeArrays(rawResponse);

      consecutiveTimeouts = 0;
      markAttempted(parentContextId);

      const spaceNotFound =
        response.success === false &&
        response.error?.code === ErrCodeSpaceNotFound;

      // A retired category legitimately resolves to no space every single
      // pass — that is a natural skip, not a failure, and must never block
      // the "repeat until failed==0" termination protocol.
      if (response.success === false && !spaceNotFound) {
        markFailed(parentContextId);
      }

      drifted +=
        response.added.length +
        response.removed.length +
        response.pruned_unknown.length +
        response.unknown_kept.length;
      if (!passDryRun) {
        repaired +=
          response.added.length +
          response.removed.length +
          response.pruned_unknown.length;
      }
      unresolvedCount += response.unresolved.length;
      unknownKeptCount += response.unknown_kept.length;
      parentPointersDeferredCount += response.parent_pointers_deferred.length;

      if (!passDryRun) {
        cumulativeWrites +=
          response.added.length +
          response.removed.length +
          response.pruned_unknown.length +
          response.parent_pointers_repaired.length;
        if (cumulativeWrites > input.maxOperations) {
          aborted = 'budget-exhausted';
        }
      }

      return response;
    };

    // A category is excluded from the forum-level desired set only on a
    // *definitive* SPACE_NOT_FOUND. Anything else — including `undefined`
    // (transport timeout/channel error, i.e. "we don't know") — keeps the
    // category in the desired set: at worst a no-op add, never a
    // destructive removal of a still-live category driven by a transient
    // RPC failure rather than by desired state (R-2 / FR-021).
    const shouldIncludeInDesiredSet = (
      response: SetChildrenResponse | undefined
    ) =>
      !(
        response !== undefined &&
        response.success === false &&
        response.error?.code === ErrCodeSpaceNotFound
      );

    /**
     * One full sweep across every category then the forum-level parent.
     * The forum-level desired set is only known once every category in
     * THIS sweep has been attempted, so the forum-level call is always
     * last — see FR-021.
     */
    const runSweep = async (
      applyRemovals: boolean,
      passDryRun: boolean
    ): Promise<void> => {
      sweepIssued = 0;
      sweepExplicitFailures = 0;

      const resolvedCategoryContextIds: string[] = [];

      for (const category of Object.values(ForumDiscussionCategory)) {
        if (isAborted()) break;
        const contextId = getForumCategoryContextId(forum.id, category);
        const desired = desiredByCategory.get(contextId) ?? [];
        const response = await attempt(
          contextId,
          desired,
          false,
          applyRemovals,
          passDryRun
        );
        if (shouldIncludeInDesiredSet(response)) {
          resolvedCategoryContextIds.push(contextId);
        }
      }

      if (!isAborted()) {
        await attempt(
          forum.id,
          resolvedCategoryContextIds,
          true,
          applyRemovals,
          passDryRun
        );
      }

      const neverIssuedThisSweep = totalIntendedParents - sweepIssued;
      callBasedFailed += sweepExplicitFailures + neverIssuedThisSweep;
    };

    if (input.dryRun) {
      // Read-only: one classification sweep with removals reported (never
      // applied) so the report is the full picture, not just the adds.
      await runSweep(true, true);
    } else {
      await runSweep(false, false); // phase A — adds only, every parent
      if (!isAborted()) {
        await runSweep(true, false); // phase B — full converge, every parent
      }
    }

    const scanned = outcomes.size;
    const failed = callBasedFailed;

    const summary: ForumHierarchyReconcilePassSummary = {
      scanned,
      drifted,
      repaired,
      unresolved: unresolvedCount,
      failed,
      unknownKept: unknownKeptCount,
      parentPointersDeferred: parentPointersDeferredCount,
      aborted,
      adapterDisabled,
    };

    await this.recordAudit(actorID, taskId, input, summary);

    if (adapterDisabled) {
      await this.taskService.completeWithError(
        taskId,
        'Communications adapter is disabled — no convergence was attempted'
      );
      return;
    }

    if (aborted) {
      await this.taskService.completeWithError(taskId, `aborted: ${aborted}`);
      return;
    }

    await this.taskService.updateTaskResults(
      taskId,
      `Reconcile pass complete: ${JSON.stringify(summary)}`,
      false
    );
    await this.taskService.complete(
      taskId,
      failed > 0 ? TaskStatus.ERRORED : TaskStatus.COMPLETED
    );
  }

  private buildDesiredByCategory(forum: Forum): Map<string, string[]> {
    const desiredByCategory = new Map<string, string[]>();

    for (const discussion of forum.discussions ?? []) {
      if (!discussion.comments) continue;
      const categoryContextId = getForumCategoryContextId(
        forum.id,
        discussion.category
      );
      const ids = desiredByCategory.get(categoryContextId) ?? [];
      ids.push(discussion.comments.id);
      desiredByCategory.set(categoryContextId, ids);
    }

    return desiredByCategory;
  }

  private async recordAudit(
    actorID: string,
    taskId: string,
    input: AdminCommunicationReconcileForumHierarchyInput,
    summary: ForumHierarchyReconcilePassSummary
  ): Promise<void> {
    try {
      await this.platformOperationsAuditService.recordOperation({
        actorID,
        action: 'adminCommunicationReconcileForumHierarchy',
        outcome: summary.failed === 0 ? 'success' : 'failure',
        target: {
          taskId,
          dryRun: input.dryRun,
          pruneUnknown: input.pruneUnknown,
          repairRoomParentPointers: input.repairRoomParentPointers,
          maxOperations: input.maxOperations,
          ...summary,
        },
      });
    } catch (error) {
      // Fail-open by house contract (PlatformOperationsAuditService already
      // swallows internally) — this catch is belt-and-braces so an audit
      // defect can never take the reconcile pass down with it.
      this.logger.warn?.(
        {
          message:
            'Failed to record audit entry for forum hierarchy reconcile pass',
          taskId,
          error: error instanceof Error ? error.message : String(error),
        },
        LogContext.COMMUNICATION
      );
    }
  }
}
