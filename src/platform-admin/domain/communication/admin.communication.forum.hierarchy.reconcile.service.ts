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
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { TaskService } from '@services/task';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import type Redis from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { AdminCommunicationReconcileForumHierarchyInput } from './dto/admin.communication.dto.reconcile.forum.hierarchy';
import {
  acquireReconcileLease,
  ReconcileLease,
  releaseReconcileLease,
  renewReconcileLease,
} from './forum.hierarchy.reconcile.lease';

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
  /**
   * Pointer repairs no pass can ever complete under the adapter's current
   * per-call budget, as opposed to the transient deferrals above. Reported
   * separately because the response is to raise the budget, not to run again.
   */
  parentPointersUnprocessable: number;
  /**
   * Parents the final sweep did not report as converged. Zero is the real
   * completion condition; `failed` only reports execution errors.
   */
  unconverged: number;
  aborted: 'circuit-breaker' | 'budget-exhausted' | 'ownership-lost' | null;
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
  parent_pointers_unprocessable: response.parent_pointers_unprocessable ?? [],
});

const emptySummary = (): ForumHierarchyReconcilePassSummary => ({
  scanned: 0,
  drifted: 0,
  repaired: 0,
  unresolved: 0,
  failed: 0,
  unknownKept: 0,
  parentPointersDeferred: 0,
  parentPointersUnprocessable: 0,
  unconverged: 0,
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
    @Inject(MESSAGING_REDIS_CLIENT)
    private readonly redis: Redis,
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
    // Ownership is taken before anything else, including reading the forum: a
    // second pass must be refused without first repeating the work the first
    // pass is already doing.
    let lease: ReconcileLease | null = null;
    try {
      lease = await acquireReconcileLease(this.redis);
    } catch (error) {
      this.logger.error?.(
        `Could not reach Redis to take forum hierarchy reconcile ownership: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      await this.recordAudit(actorID, taskId, input, erroredSummary());
      await this.taskService
        .completeWithError(
          taskId,
          'Could not take forum hierarchy reconcile ownership (Redis unreachable) — refusing to start, because an unowned pass cannot be prevented from racing another'
        )
        .catch(() => undefined);
      return;
    }

    if (!lease) {
      this.logger.warn?.(
        {
          message:
            'Forum hierarchy reconcile already owned by another pass — refusing to start a second overlapping pass',
          taskId,
        },
        LogContext.COMMUNICATION
      );
      await this.recordAudit(actorID, taskId, input, erroredSummary());
      await this.taskService
        .completeWithError(
          taskId,
          'A forum hierarchy reconcile pass is already running — wait for it to finish before starting another'
        )
        .catch(() => undefined);
      return;
    }

    try {
      await this.runReconcilePass(taskId, actorID, input, lease);
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
    } finally {
      // Released here rather than at the end of the try, so a pass that threw
      // does not hold ownership until the lease expires. Compare-and-delete,
      // so a pass whose lease already expired and was taken over cannot
      // delete the new owner's lease on its way out. A release that fails is
      // survivable — the lease expires on its own — so it must never mask the
      // original error.
      await releaseReconcileLease(this.redis, lease).catch(releaseError => {
        this.logger.warn?.(
          {
            message:
              'Failed to release forum hierarchy reconcile ownership; it will expire on its own',
            taskId,
            error:
              releaseError instanceof Error
                ? releaseError.message
                : String(releaseError),
          },
          LogContext.COMMUNICATION
        );
      });
    }
  }

  private async runReconcilePass(
    taskId: string,
    actorID: string,
    input: AdminCommunicationReconcileForumHierarchyInput,
    lease: ReconcileLease
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
    let aborted:
      | 'circuit-breaker'
      | 'budget-exhausted'
      | 'ownership-lost'
      | null = null;
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
    // Per-sweep count of parents the adapter did not report as converged.
    // Only the final sweep's value is meaningful for completion: an add-only
    // phase A is expected to leave extras attached, and a dry run is expected
    // to report drift rather than fix it.
    let sweepUnconverged = 0;
    let lastSweepUnconverged = 0;
    let unprocessablePointerCount = 0;

    // established[categoryContextId] = the rooms this pass has positively
    // confirmed are attached under that category. It is the sole source of
    // removal authorization: a room may lose its edge to some other category
    // only because it has been established under this one.
    //
    // A call that failed contributes nothing, even partially. The response
    // reports which desired ids did not resolve, but not which individual
    // writes were rejected, so after a failure the pass cannot tell an
    // established room from one whose add was refused — and guessing in the
    // permissive direction is what authorizes removing a room's last edge.
    const established = new Map<string, Set<string>>();

    // The same shape taken straight from the database snapshot, used only by
    // the dry run — which performs no writes, so nothing it authorizes can be
    // acted on.
    const snapshotByCategory = new Map<string, Set<string>>(
      [...desiredByCategory].map(([categoryId, rooms]) => [
        categoryId,
        new Set(rooms),
      ])
    );

    const recordEstablished = (
      categoryContextId: string,
      desired: string[],
      response: SetChildrenResponse | undefined
    ): void => {
      if (response === undefined || response.success !== true) {
        established.set(categoryContextId, new Set());
        return;
      }
      const unresolved = new Set(response.unresolved);
      established.set(
        categoryContextId,
        new Set(desired.filter(id => !unresolved.has(id)))
      );
    };

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
      passDryRun: boolean,
      removable: string[] = []
    ): Promise<SetChildrenResponse | undefined> => {
      if (isAborted()) return undefined;

      // Ownership is re-confirmed immediately before any call that can
      // remove an edge, and the call is abandoned if it has been lost.
      //
      // This is what makes the removal authorization safe across passes. The
      // `established` confirmations this call's authorization list is built
      // from are historical observations: another pass holding ownership
      // could have moved the room since, and removing on the strength of a
      // confirmation that is no longer true is how a room ends up attached to
      // nothing while both passes report a clean result. Renewing here proves
      // no other pass has owned the forum in the meantime, so every
      // confirmation gathered under this lease is still the current truth.
      //
      // Read-only work does not need this: a dry run writes nothing, and an
      // add-only phase can only ever create an edge the desired state asks
      // for.
      if (applyRemovals && !passDryRun) {
        const stillOwned = await renewReconcileLease(this.redis, lease).catch(
          () => false
        );
        if (!stillOwned) {
          this.logger.error?.(
            'Lost forum hierarchy reconcile ownership mid-pass — abandoning before any further removal',
            undefined,
            LogContext.COMMUNICATION
          );
          aborted = 'ownership-lost';
          return undefined;
        }
      }

      sweepIssued++;
      const rawResponse = await this.communicationAdapter.setChildren({
        parent_context_id: parentContextId,
        desired_child_context_ids: desired,
        children_are_spaces: childrenAreSpaces,
        apply_removals: applyRemovals,
        // Removal is authorized, never inferred. `removable` names only the
        // rooms a preceding add phase positively established under their
        // current category, so a room whose destination could not be
        // established keeps the edge it already has. Absence from `desired`
        // authorizes nothing: a discussion created or recategorised after the
        // snapshot above was read is missing from it while being entirely
        // correct in Matrix.
        removable_child_context_ids: removable,
        prune_unknown: input.pruneUnknown,
        sync_child_parent: input.repairRoomParentPointers,
        dry_run: passDryRun,
        // Correlates the adapter's log lines with this pass's task and audit
        // row.
        operation_id: taskId,
        // Expiry is the lease's own, which is what fences execution against a
        // previous owner. A new owner can only acquire after the previous
        // lease fully expired, so every request the previous owner issued has
        // expired too — and the adapter rejects an expired request before
        // performing any read or write. That removes the need for any
        // hand-off protocol or waiting period between owners.
        expires_at_unix_ms: lease.expiresAt,
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
      // the termination protocol.
      //
      // But that only holds for a category with nothing in it. A category
      // that still holds discussions and has no Matrix space is incomplete
      // work, not an expected skip: its rooms have nowhere to be attached,
      // so treating it as benign would let the pass report a clean result
      // while those discussions sit outside the hierarchy entirely — and, in
      // the two-phase sweep, would let their old edges be removed on the
      // strength of a destination that does not exist. Space creation belongs
      // to the provisioning/sync path, so this is reported rather than fixed
      // here.
      const emptyCategorySkip = spaceNotFound && desired.length === 0;
      if (response.success === false && !emptyCategorySkip) {
        markFailed(parentContextId);
      }
      if (spaceNotFound && !emptyCategorySkip) {
        this.logger.warn?.(
          {
            message:
              'Forum category has discussions but no Matrix space — run the space sync before reconciling',
            taskId,
            parentContextId,
            desiredCount: desired.length,
          },
          LogContext.COMMUNICATION
        );
      }

      // Convergence is reported per call and is stricter than success: a call
      // can execute without error and still leave a desired child unresolved,
      // an extra edge attached, or a pointer repair outstanding.
      if (!emptyCategorySkip && response.converged !== true) {
        sweepUnconverged++;
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
      unprocessablePointerCount +=
        response.parent_pointers_unprocessable.length;

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
      sweepUnconverged = 0;

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
          passDryRun,
          // A dry run writes nothing, so it authorizes from the snapshot and
          // reports the drift in full — including the removals a real pass
          // would only reach once it had established their destinations.
          // Authorizing a dry run from `established` instead would make the
          // preview depend on how far through the sweep each category sat,
          // and under-report exactly the work the operator is previewing.
          this.removableForCategory(
            contextId,
            passDryRun ? snapshotByCategory : established
          )
        );
        recordEstablished(contextId, desired, response);
        if (shouldIncludeInDesiredSet(response)) {
          resolvedCategoryContextIds.push(contextId);
        }
      }

      if (!isAborted()) {
        // The forum-level call authorizes no removals. Its children are the
        // category spaces themselves, and every category space that exists
        // resolves and therefore stays desired — so the only edges a removal
        // could reach here are children this pass knows nothing about, which
        // is exactly the class that must be reported rather than deleted.
        await attempt(
          forum.id,
          resolvedCategoryContextIds,
          true,
          applyRemovals,
          passDryRun,
          []
        );
      }

      lastSweepUnconverged = sweepUnconverged;

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
      parentPointersUnprocessable: unprocessablePointerCount,
      unconverged: lastSweepUnconverged,
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
    // A pass is complete only when the hierarchy actually converged, not
    // merely when nothing errored. Unresolved desired rooms, extra edges kept
    // because nothing authorized removing them, and outstanding pointer
    // repairs all leave `failed` at zero while leaving real work undone — so
    // completing on `failed === 0` would tell an operator following a
    // repeat-until-clean runbook to stop while the forum is still drifted.
    //
    // A dry run is exempt: reporting drift is its entire purpose, so
    // unconverged parents are its expected result rather than a failure.
    const converged = input.dryRun || lastSweepUnconverged === 0;
    await this.taskService.complete(
      taskId,
      failed > 0 || !converged ? TaskStatus.ERRORED : TaskStatus.COMPLETED
    );
  }

  /**
   * The rooms this parent category is authorized to let go of: every room
   * established under a *different* category by the preceding add phase.
   *
   * This is the whole safety property of the removal half. A room is
   * removable from here only because it has been confirmed to be attached
   * somewhere else, so the two failure modes that used to lose a discussion
   * both become impossible rather than merely unlikely:
   *
   *   - a discussion created or recategorised after the desired snapshot was
   *     read is in no category's established set, so nothing authorizes
   *     removing it, and its correct edge survives;
   *   - a discussion whose move failed — the destination space is missing, or
   *     the add was rejected — is likewise unestablished, so its old edge is
   *     kept rather than removed in favour of a destination that never
   *     materialised.
   *
   * The worst residual is a discussion that stays under its previous category
   * for one pass and converges on the next. It can never end up under none.
   */
  private removableForCategory(
    categoryContextId: string,
    established: Map<string, Set<string>>
  ): string[] {
    const removable: string[] = [];
    for (const [otherCategoryId, rooms] of established) {
      if (otherCategoryId === categoryContextId) continue;
      removable.push(...rooms);
    }
    return removable;
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
