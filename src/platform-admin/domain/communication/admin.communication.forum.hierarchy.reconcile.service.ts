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

    const isAborted = () => aborted !== null || adapterDisabled;
    const markFailed = (parentContextId: string) => {
      outcomes.set(parentContextId, { failed: true });
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

      const response = await this.communicationAdapter.setChildren({
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
      if (isDisabledSentinel(response)) {
        adapterDisabled = true;
        markFailed(parentContextId);
        return undefined;
      }

      if (response === undefined) {
        consecutiveTimeouts++;
        markFailed(parentContextId);
        if (consecutiveTimeouts >= 3) {
          aborted = 'circuit-breaker';
        }
        return undefined;
      }

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

    const parentResolved = (response: SetChildrenResponse | undefined) =>
      response !== undefined &&
      !(
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
        if (parentResolved(response)) {
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
    const explicitlyFailed = [...outcomes.values()].filter(
      o => o.failed
    ).length;
    const neverAttempted = totalIntendedParents - scanned;
    const failed = explicitlyFailed + (isAborted() ? neverAttempted : 0);

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
