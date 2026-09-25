import { LogContext } from '@common/enums';
import {
  RoomReadinessReason,
  RoomReadinessState,
  toRoomReadiness,
} from '@domain/communication/room/dto/room.readiness';
import { IRoom } from '@domain/communication/room/room.interface';
import {
  describeAdapterFailure,
  RoomReadinessService,
} from '@domain/communication/room/room.readiness.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { isRoomNotFoundError } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';
import {
  ConversationRoomRepairOutcome,
  ConversationRoomRepairResult,
} from './dto/conversation.repair.result';

/**
 * Idempotent repair of a conversation's backend room:
 *   probe → (create when missing) → converge membership → record readiness.
 *
 * Only the platform's own authoritative state is re-applied, so a repair can
 * never grant anything: the room id is the conversation's, the member list is
 * the persisted membership. Two concurrent repairs converge; the second finds
 * the room and nothing to change.
 */
@Injectable()
export class ConversationRepairService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly roomService: RoomService,
    private readonly roomReadinessService: RoomReadinessService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async repair(
    conversation: IConversation
  ): Promise<ConversationRoomRepairResult> {
    const room =
      conversation.room ??
      (await this.conversationService.getRoom(conversation.id));
    const platformMembers =
      await this.conversationService.getConversationMemberActorIds(
        conversation.id
      );

    // 1. Probe: does the backend room exist, and who is in it?
    let backendMembers: string[];
    let created = false;
    try {
      backendMembers = await this.communicationAdapter.getRoomMembers(room.id);
    } catch (probeError) {
      if (!isRoomNotFoundError(probeError)) {
        return this.failedAtBackend(conversation, room, probeError, 'probe');
      }
      // 2. Ensure: re-issue creation under the same room id (idempotent on
      // the backend alias), with the platform membership as initial members.
      try {
        await this.roomService.requestExternalRoomCreation(room, {
          displayName: room.displayName,
          initialMembers: platformMembers,
          avatarUrl: room.avatarUrl,
        });
        created = true;
        backendMembers = platformMembers;
      } catch (createError) {
        return this.failedAtBackend(
          conversation,
          room,
          createError,
          'creation'
        );
      }
    }

    // 3. Converge membership to the platform list.
    const toAdd = platformMembers.filter(id => !backendMembers.includes(id));
    const toRemove = backendMembers.filter(id => !platformMembers.includes(id));
    let membersAdded = 0;
    let membersRemoved = 0;

    for (const actorID of toAdd) {
      const ok = await this.communicationAdapter.batchAddMember(actorID, [
        room.id,
      ]);
      if (!ok) {
        return this.rejectedStep(
          conversation,
          room,
          'The messaging backend rejected adding a member to the room.',
          membersAdded,
          membersRemoved
        );
      }
      membersAdded++;
    }

    for (const actorID of toRemove) {
      try {
        await this.communicationAdapter.batchRemoveMember(
          actorID,
          [room.id],
          'Not a member of this conversation on the platform',
          { ensureAllSucceeded: true }
        );
        membersRemoved++;
      } catch (removeError) {
        this.logger.warn?.(
          `Repair of conversation ${conversation.id}: backend rejected removing actor ${actorID} from room ${room.id}: ${(removeError as Error)?.message}`,
          LogContext.COMMUNICATION_CONVERSATION
        );
        return this.rejectedStep(
          conversation,
          room,
          'The messaging backend rejected removing a member from the room.',
          membersAdded,
          membersRemoved
        );
      }
    }

    // 4. Record: the room exists and membership matches.
    await this.roomReadinessService.record(
      room,
      {
        state: RoomReadinessState.READY,
        reason: created
          ? RoomReadinessReason.PROVISIONED
          : RoomReadinessReason.VERIFIED,
      },
      'PROBE'
    );

    const outcome = created
      ? ConversationRoomRepairOutcome.ROOM_CREATED
      : membersAdded + membersRemoved > 0
        ? ConversationRoomRepairOutcome.MEMBERSHIP_CONVERGED
        : ConversationRoomRepairOutcome.ROOM_VERIFIED;

    this.logger.verbose?.(
      `Repaired conversation ${conversation.id} room ${room.id}: ${outcome} (+${membersAdded}/-${membersRemoved})`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return {
      conversation,
      outcome,
      readiness: toRoomReadiness(room.readiness),
      membersAdded,
      membersRemoved,
    };
  }

  /** The backend could not answer the probe or the creation: readiness FAILED. */
  private async failedAtBackend(
    conversation: IConversation,
    room: IRoom,
    error: unknown,
    step: 'probe' | 'creation'
  ): Promise<ConversationRoomRepairResult> {
    this.logger.error?.(
      `Repair of conversation ${conversation.id} failed at ${step} for room ${room.id}`,
      (error as Error)?.stack,
      LogContext.COMMUNICATION_CONVERSATION
    );
    const failure = describeAdapterFailure(error);
    await this.roomReadinessService.record(
      room,
      {
        state: RoomReadinessState.FAILED,
        reason: failure.reason,
        detail: failure.detail,
      },
      'PROBE'
    );
    return {
      conversation,
      outcome: ConversationRoomRepairOutcome.FAILED,
      readiness: toRoomReadiness(room.readiness),
      membersAdded: 0,
      membersRemoved: 0,
      detail: `Repair ${step} failed: ${failure.detail}`,
    };
  }

  /** A membership change was rejected: the room exists, readiness unchanged. */
  private rejectedStep(
    conversation: IConversation,
    room: IRoom,
    detail: string,
    membersAdded: number,
    membersRemoved: number
  ): ConversationRoomRepairResult {
    return {
      conversation,
      outcome: ConversationRoomRepairOutcome.FAILED,
      readiness: toRoomReadiness(room.readiness),
      membersAdded,
      membersRemoved,
      detail,
    };
  }
}
