import {
  JoinRule,
  JoinRuleInvite,
  JoinRuleRestricted,
  RepairReport,
  RoomVisibilityShared,
} from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { SpaceMembershipProjectionService } from '@domain/space/space-membership-projection/space.membership.projection.service';
import { TaskStatus } from '@domain/task/dto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { TaskService } from '@services/task';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { In, Repository } from 'typeorm';
import { AdminCommunicationReconcileGovernanceInput } from './dto/admin.communication.dto.reconcile.governance';

// Pause after every adapter call: each RPC goes through AMQP with a 30s
// timeout, and an unpaced pass over a large space tree causes cascading
// timeouts on the adapter side (same pacing as the space-hierarchy sync).
const THROTTLE_DELAY_MS = 200;

export interface GovernanceReconcilePassSummary {
  scanned: number;
  repaired: number;
  unresolved: number;
  failed: number;
  dryRun: boolean;
  force: boolean;
  budgetRemaining: number;
  adapterDisabled: boolean;
  aborted: 'budget-exhausted' | null;
}

/** One space-anchored room with the join rule the platform declares for it. */
interface AnchoredRoom {
  roomId: string;
  joinRule: JoinRule;
}

/**
 * The disabled sentinel carries no `success` field at all — it is
 * deliberately not shaped like a repair report, so it can never be mistaken
 * for one.
 */
const isDisabledSentinel = (
  response: RepairReport | { disabled: true } | undefined
): response is { disabled: true } =>
  response !== undefined && 'disabled' in response;

/**
 * Report-first, audited, budgeted reconciliation of messaging-side
 * governance for one space subtree or one conversation room.
 *
 * On-demand only — there is deliberately no scheduler here: desired state is
 * always recomputable from the database, drift is surfaced by the report
 * (dry-run) pass, and a re-invocation is the only compensation a partial
 * pass ever gets. Every count in the audit row and task result comes from
 * the adapters' reported arrays and write counts, never from how many times
 * a loop ran — a disabled or unreachable adapter can never look like a
 * clean pass. Orphaned rooms are reported, never deleted.
 */
@Injectable()
export class AdminCommunicationReconcileGovernanceService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private spaceLookupService: SpaceLookupService,
    private spaceMembershipProjectionService: SpaceMembershipProjectionService,
    private conversationService: ConversationService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    private taskService: TaskService,
    private platformOperationsAuditService: PlatformOperationsAuditService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Scope validation, called by the resolver BEFORE a task is created so a
   * malformed request fails the mutation synchronously.
   */
  public validateScope(
    input: AdminCommunicationReconcileGovernanceInput
  ): void {
    const scopes = [input.spaceID, input.conversationID].filter(
      id => id !== undefined && id !== null
    ).length;
    if (scopes !== 1) {
      throw new ValidationException(
        'Exactly one of spaceID and conversationID must be provided',
        LogContext.COMMUNICATION
      );
    }
  }

  /**
   * Run one reconcile pass and settle the given task. Kicked off
   * fire-and-forget from the resolver — this method owns the task's entire
   * lifecycle from here (results, completion, the one audit row) and never
   * lets a rejection escape the call site.
   */
  async reconcile(
    taskId: string,
    actorID: string,
    input: AdminCommunicationReconcileGovernanceInput
  ): Promise<void> {
    try {
      await this.runPass(taskId, actorID, input);
    } catch (error) {
      this.logger.error?.(
        `Governance reconcile pass threw: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );

      // failed: 1 is a deliberate sentinel — an audit row for a pass that
      // never computed a real summary must not derive success from zeros.
      await this.recordAudit(actorID, taskId, input, {
        scanned: 0,
        repaired: 0,
        unresolved: 0,
        failed: 1,
        dryRun: input.dryRun,
        force: input.force,
        budgetRemaining: input.maxOperations,
        adapterDisabled: false,
        aborted: null,
      });

      try {
        await this.taskService.completeWithError(
          taskId,
          `Governance reconcile pass failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } catch (settleError) {
        this.logger.error?.(
          'Failed to settle task after a governance reconcile pass threw',
          settleError instanceof Error ? settleError.stack : undefined,
          LogContext.COMMUNICATION
        );
      }
    }
  }

  private async runPass(
    taskId: string,
    actorID: string,
    input: AdminCommunicationReconcileGovernanceInput
  ): Promise<void> {
    this.validateScope(input);

    const state = {
      scanned: 0,
      repaired: 0,
      unresolved: 0,
      failed: 0,
      writes: 0,
      adapterDisabled: false,
      aborted: null as 'budget-exhausted' | null,
    };

    if (!this.communicationAdapter.isEnabled()) {
      // A disabled adapter is a failed pass, not a clean zero-drift one —
      // checked before any scope work so no per-target no-op "success" can
      // ever be recorded.
      state.adapterDisabled = true;
      state.failed = 1;
    } else if (input.conversationID) {
      await this.reconcileConversation(input, state);
    } else {
      await this.reconcileSpaceTree(input, state);
    }

    const summary: GovernanceReconcilePassSummary = {
      scanned: state.scanned,
      repaired: state.repaired,
      unresolved: state.unresolved,
      failed: state.failed,
      dryRun: input.dryRun,
      force: input.force,
      budgetRemaining: Math.max(0, input.maxOperations - state.writes),
      adapterDisabled: state.adapterDisabled,
      aborted: state.aborted,
    };

    await this.recordAudit(actorID, taskId, input, summary);

    if (state.adapterDisabled) {
      await this.taskService.completeWithError(
        taskId,
        'Communications adapter is disabled — no reconciliation was attempted'
      );
      return;
    }

    if (state.aborted) {
      await this.taskService.completeWithError(
        taskId,
        `aborted: ${state.aborted} — ${JSON.stringify(summary)}`
      );
      return;
    }

    await this.taskService.updateTaskResults(
      taskId,
      `Governance reconcile pass complete: ${JSON.stringify(summary)}`,
      false
    );
    await this.taskService.complete(
      taskId,
      state.failed > 0 ? TaskStatus.ERRORED : TaskStatus.COMPLETED
    );
  }

  // ==========================================================================
  // Space scope
  // ==========================================================================

  private async reconcileSpaceTree(
    input: AdminCommunicationReconcileGovernanceInput,
    state: {
      scanned: number;
      repaired: number;
      unresolved: number;
      failed: number;
      writes: number;
      adapterDisabled: boolean;
      aborted: 'budget-exhausted' | null;
    }
  ): Promise<void> {
    const spaceID = input.spaceID as string;
    // Existence check — an unknown space fails the pass via the outer guard.
    await this.spaceLookupService.getSpaceOrFail(spaceID);
    const descendantIDs =
      await this.spaceLookupService.getAllDescendantSpaceIDs(spaceID);
    const scopeIDs = [spaceID, ...descendantIDs];

    // Parents before children so a created space room can anchor under an
    // already-existing parent space room.
    const spaces = await this.spaceRepository.find({
      where: { id: In(scopeIDs) },
      order: { level: 'ASC' },
      relations: {
        parentSpace: true,
        about: { profile: true },
        community: { communication: { updates: true } },
      },
    });
    const roomsBySpace = await this.loadAnchoredRooms(scopeIDs);

    const remainingScope = () => {
      // Everything not yet scanned: the spaces still ahead plus each of
      // their anchored rooms — honest-partial reporting of what a budget or
      // adapter abort left untouched.
      const remainingSpaces = spaces.slice(state.scanned);
      return remainingSpaces.reduce(
        (count, space) => count + 1 + (roomsBySpace.get(space.id)?.length ?? 0),
        0
      );
    };

    for (const space of spaces) {
      if (state.adapterDisabled || state.aborted) break;

      if (input.ladder) {
        await this.repairSpaceRoom(space, input, state);
      }

      if (
        input.membership &&
        !state.adapterDisabled &&
        state.aborted === null
      ) {
        await this.projectSpaceMembership(space.id, input, state);
      }

      if (input.ladder) {
        for (const room of roomsBySpace.get(space.id) ?? []) {
          if (state.adapterDisabled || state.aborted) break;
          await this.repairAnchoredRoom(space.id, room, input, state);
        }
      }

      state.scanned++;

      if (state.aborted === null && state.writes >= input.maxOperations) {
        state.aborted = 'budget-exhausted';
      }
    }

    if (state.adapterDisabled || state.aborted) {
      state.unresolved += remainingScope();
      if (state.adapterDisabled) {
        state.failed += 1;
      }
    }
  }

  private async repairSpaceRoom(
    space: Space,
    input: AdminCommunicationReconcileGovernanceInput,
    state: {
      repaired: number;
      unresolved: number;
      failed: number;
      writes: number;
      adapterDisabled: boolean;
    }
  ): Promise<void> {
    // Coverage: a space with no messaging-side space room gets one — the
    // only creation this pass ever performs (rooms are reported, never
    // created and never deleted here).
    const existing = await this.communicationAdapter.getSpace(space.id);
    await this.throttle();
    if (!existing) {
      state.writes++;
      if (!input.dryRun) {
        try {
          await this.communicationAdapter.createSpace(
            space.id,
            space.about?.profile?.displayName || space.nameID,
            space.parentSpace?.id,
            undefined,
            JoinRuleInvite
          );
          state.repaired++;
        } catch (error) {
          state.failed++;
          this.logger.warn?.(
            `Governance reconcile: failed to create space room for ${space.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            LogContext.COMMUNICATION
          );
        }
        await this.throttle();
      }
    }

    const elevated =
      await this.spaceMembershipProjectionService.elevatedMembers(space.id);
    const report = await this.communicationAdapter.repairSpaceGovernance({
      alkemio_context_id: space.id,
      elevated_actor_ids: [...elevated],
      custom_state: {
        'io.alkemio.entity': {
          entityId: space.id,
          entityType: 'space',
          parentId: space.parentSpace?.id ?? null,
        },
      },
      dry_run: input.dryRun,
    });
    await this.throttle();
    this.foldRepairReport(report, space.id, state);
  }

  private async projectSpaceMembership(
    spaceID: string,
    input: AdminCommunicationReconcileGovernanceInput,
    state: {
      repaired: number;
      unresolved: number;
      failed: number;
      writes: number;
      adapterDisabled: boolean;
    }
  ): Promise<void> {
    const report = await this.spaceMembershipProjectionService.projectSpace(
      spaceID,
      {
        dryRun: input.dryRun,
        force: input.force,
        budget: Math.max(1, input.maxOperations - state.writes),
      }
    );
    state.repaired += report.repaired;
    state.writes += report.writes;
    state.unresolved += report.unresolved.length;
    state.failed += report.failed.length;
    if (
      report.aborted === 'adapter-disabled' ||
      report.aborted === 'adapter-unreachable'
    ) {
      state.adapterDisabled = report.aborted === 'adapter-disabled';
      state.failed += report.aborted === 'adapter-unreachable' ? 1 : 0;
    }
  }

  private async repairAnchoredRoom(
    spaceID: string,
    room: AnchoredRoom,
    input: AdminCommunicationReconcileGovernanceInput,
    state: {
      repaired: number;
      unresolved: number;
      failed: number;
      writes: number;
      adapterDisabled: boolean;
    }
  ): Promise<void> {
    const report = await this.communicationAdapter.repairRoomGovernance({
      alkemio_room_id: room.roomId,
      join_rule: room.joinRule,
      parent_context_id: spaceID,
      visibility: RoomVisibilityShared,
      is_direct: false,
      custom_state: {
        'io.alkemio.entity': {
          entityId: room.roomId,
          entityType: 'thread',
          parentId: spaceID,
        },
      },
      dry_run: input.dryRun,
    });
    await this.throttle();
    this.foldRepairReport(report, room.roomId, state);
  }

  /**
   * Every anchored room of each in-scope space, with the join rule the
   * platform declares for it: the updates room is space-entitled by nature;
   * a callout comment room is space-entitled only while its callout is
   * published; post and calendar-event comment rooms stay platform-driven.
   */
  private async loadAnchoredRooms(
    scopeIDs: string[]
  ): Promise<Map<string, AnchoredRoom[]>> {
    const roomsBySpace = new Map<string, AnchoredRoom[]>();
    const push = (spaceId: string, room: AnchoredRoom) => {
      const rooms = roomsBySpace.get(spaceId) ?? [];
      rooms.push(room);
      roomsBySpace.set(spaceId, rooms);
    };

    const updatesRooms: { roomId: string; spaceId: string }[] =
      await this.spaceRepository.manager
        .createQueryBuilder()
        .select('r.id', 'roomId')
        .addSelect('s.id', 'spaceId')
        .from('room', 'r')
        .innerJoin('communication', 'comm', 'comm."updatesId" = r.id')
        .innerJoin('community', 'cty', 'cty."communicationId" = comm.id')
        .innerJoin('space', 's', 's."communityId" = cty.id')
        .where('s.id IN (:...scopeIDs)', { scopeIDs })
        .getRawMany();
    for (const { roomId, spaceId } of updatesRooms) {
      push(spaceId, { roomId, joinRule: JoinRuleRestricted });
    }

    const calloutRooms: {
      roomId: string;
      spaceId: string;
      visibility: string | null;
    }[] = await this.spaceRepository.manager
      .createQueryBuilder()
      .select('r.id', 'roomId')
      .addSelect('s.id', 'spaceId')
      .addSelect("cal.settings->>'visibility'", 'visibility')
      .from('room', 'r')
      .innerJoin('callout', 'cal', 'cal."commentsId" = r.id')
      .innerJoin('callouts_set', 'cs', 'cs.id = cal."calloutsSetId"')
      .innerJoin('collaboration', 'col', 'col."calloutsSetId" = cs.id')
      .innerJoin('space', 's', 's."collaborationId" = col.id')
      .where('s.id IN (:...scopeIDs)', { scopeIDs })
      .getRawMany();
    for (const { roomId, spaceId, visibility } of calloutRooms) {
      push(spaceId, {
        roomId,
        joinRule:
          visibility === CalloutVisibility.PUBLISHED
            ? JoinRuleRestricted
            : JoinRuleInvite,
      });
    }

    const postRooms: { roomId: string; spaceId: string }[] =
      await this.spaceRepository.manager
        .createQueryBuilder()
        .select('r.id', 'roomId')
        .addSelect('s.id', 'spaceId')
        .from('room', 'r')
        .innerJoin('post', 'p', 'p."commentsId" = r.id')
        .innerJoin('callout_contribution', 'cc', 'cc."postId" = p.id')
        .innerJoin('callout', 'cal', 'cal.id = cc."calloutId"')
        .innerJoin('callouts_set', 'cs', 'cs.id = cal."calloutsSetId"')
        .innerJoin('collaboration', 'col', 'col."calloutsSetId" = cs.id')
        .innerJoin('space', 's', 's."collaborationId" = col.id')
        .where('s.id IN (:...scopeIDs)', { scopeIDs })
        .getRawMany();
    for (const { roomId, spaceId } of postRooms) {
      push(spaceId, { roomId, joinRule: JoinRuleInvite });
    }

    const calendarRooms: { roomId: string; spaceId: string }[] =
      await this.spaceRepository.manager
        .createQueryBuilder()
        .select('r.id', 'roomId')
        .addSelect('s.id', 'spaceId')
        .from('room', 'r')
        .innerJoin('calendar_event', 'ce', 'ce."commentsId" = r.id')
        .innerJoin('calendar', 'c', 'c.id = ce."calendarId"')
        .innerJoin('timeline', 't', 't."calendarId" = c.id')
        .innerJoin('collaboration', 'col', 'col."timelineId" = t.id')
        .innerJoin('space', 's', 's."collaborationId" = col.id')
        .where('s.id IN (:...scopeIDs)', { scopeIDs })
        .getRawMany();
    for (const { roomId, spaceId } of calendarRooms) {
      push(spaceId, { roomId, joinRule: JoinRuleInvite });
    }

    return roomsBySpace;
  }

  // ==========================================================================
  // Conversation scope
  // ==========================================================================

  private async reconcileConversation(
    input: AdminCommunicationReconcileGovernanceInput,
    state: {
      scanned: number;
      repaired: number;
      unresolved: number;
      failed: number;
      writes: number;
      adapterDisabled: boolean;
      aborted: 'budget-exhausted' | null;
    }
  ): Promise<void> {
    const conversation = await this.conversationService.getConversationOrFail(
      input.conversationID as string,
      { relations: { room: true } }
    );
    state.scanned = 1;

    if (!conversation.room) {
      // No room yet (lazy-creation era) — reported, never created here: the
      // dedicated migration mutation owns that repair.
      state.unresolved += 1;
      return;
    }
    const room = conversation.room;

    if (input.ladder) {
      const report = await this.communicationAdapter.repairRoomGovernance({
        alkemio_room_id: room.id,
        join_rule: JoinRuleInvite,
        visibility: RoomVisibilityShared,
        is_direct: room.type === RoomType.CONVERSATION_DIRECT,
        custom_state: {
          'io.alkemio.entity': {
            entityId: room.id,
            entityType: 'thread',
            parentId: null,
          },
        },
        dry_run: input.dryRun,
      });
      await this.throttle();
      this.foldRepairReport(report, room.id, state);
    }

    if (input.membership && !state.adapterDisabled) {
      const memberships = await this.conversationService.getConversationMembers(
        conversation.id
      );
      const desired = new Set(memberships.map(m => m.actorID));
      const actual = await this.communicationAdapter.getRoomMembers(room.id);
      await this.throttle();

      const toRemove = actual.filter(id => !desired.has(String(id)));
      const toAdd = [...desired].filter(
        id => !actual.some(actorId => String(actorId) === id)
      );

      for (const actorId of toRemove) {
        if (state.writes >= input.maxOperations) {
          state.aborted = 'budget-exhausted';
          state.unresolved +=
            toRemove.length - toRemove.indexOf(actorId) + toAdd.length;
          return;
        }
        state.writes++;
        if (!input.dryRun) {
          const removed = await this.communicationAdapter.batchRemoveMember(
            actorId,
            [room.id],
            'membership reconciled against conversation records'
          );
          await this.throttle();
          if (removed) {
            state.repaired++;
          } else {
            state.failed++;
          }
        }
      }

      for (const actorId of toAdd) {
        if (state.writes >= input.maxOperations) {
          state.aborted = 'budget-exhausted';
          state.unresolved += toAdd.length - toAdd.indexOf(actorId);
          return;
        }
        state.writes++;
        if (!input.dryRun) {
          const added = await this.communicationAdapter.batchAddMember(
            actorId,
            [room.id]
          );
          await this.throttle();
          if (added) {
            state.repaired++;
          } else {
            state.failed++;
          }
        }
      }
    }
  }

  // ==========================================================================
  // Shared accounting
  // ==========================================================================

  private foldRepairReport(
    report: RepairReport | { disabled: true } | undefined,
    targetId: string,
    state: {
      repaired: number;
      unresolved: number;
      failed: number;
      writes: number;
      adapterDisabled: boolean;
    }
  ): void {
    if (isDisabledSentinel(report)) {
      state.adapterDisabled = true;
      return;
    }
    if (report === undefined) {
      // Transport failure: "we don't know", never "no drift".
      state.failed++;
      this.logger.warn?.(
        `Governance reconcile: no repair report for ${targetId}`,
        LogContext.COMMUNICATION
      );
      return;
    }
    state.repaired += report.repaired;
    state.writes += report.writes;
    state.unresolved += report.unresolved?.length ?? 0;
    state.failed += report.failed?.length ?? 0;
  }

  private async recordAudit(
    actorID: string,
    taskId: string,
    input: AdminCommunicationReconcileGovernanceInput,
    summary: GovernanceReconcilePassSummary
  ): Promise<void> {
    try {
      await this.platformOperationsAuditService.recordOperation({
        actorID,
        action: 'adminCommunicationReconcileGovernance',
        outcome:
          summary.failed === 0 && !summary.adapterDisabled
            ? 'success'
            : 'failure',
        target: {
          taskId,
          spaceID: input.spaceID ?? null,
          conversationID: input.conversationID ?? null,
          ladder: input.ladder,
          membership: input.membership,
          maxOperations: input.maxOperations,
          ...summary,
        },
      });
    } catch (error) {
      // Fail-open by house contract (PlatformOperationsAuditService already
      // swallows internally) — belt-and-braces so an audit defect can never
      // take the reconcile pass down with it.
      this.logger.warn?.(
        {
          message: 'Failed to record audit entry for governance reconcile pass',
          taskId,
          error: error instanceof Error ? error.message : String(error),
        },
        LogContext.COMMUNICATION
      );
    }
  }

  private async throttle(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY_MS));
  }
}
