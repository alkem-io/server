import { JoinRule, JoinRulePublic } from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { CreateRoomInput } from '@domain/communication/room/dto/room.dto.create';
import { Room } from '@domain/communication/room/room.entity';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { isTransportError } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, In, LessThan } from 'typeorm';
import { CommunicationAdminMembershipInput } from './dto';
import { CommunicationAdminEnsureAccessInput } from './dto/admin.communication.dto.ensure.access.input';
import { CommunicationAdminMembershipResult } from './dto/admin.communication.dto.membership.result';
import { CommunicationAdminMigrateRoomsResult } from './dto/admin.communication.dto.migrate.rooms.result';
import { CommunicationAdminRoomResult } from './dto/admin.communication.dto.orphaned.room.result';
import { CommunicationAdminOrphanedUsageResult } from './dto/admin.communication.dto.orphaned.usage.result';
import { CommunicationAdminRegenerateMissingRoomsInput } from './dto/admin.communication.dto.regenerate.missing.rooms.input';
import {
  CommunicationAdminRegenerateMissingRoomsResult,
  CommunicationAdminRoomRegenerationOutcome,
} from './dto/admin.communication.dto.regenerate.missing.rooms.result';
import { CommunicationAdminRemoveOrphanedRoomInput } from './dto/admin.communication.dto.remove.orphaned.room';
import { CommunicationAdminRoomMembershipResult } from './dto/admin.communication.dto.room.result';

/** Room rows younger than this may still be waiting for their Matrix room. */
const IN_FLIGHT_GRACE_PERIOD_MS = 5 * 60 * 1000;

@Injectable()
export class AdminCommunicationService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private communicationService: CommunicationService,
    private communityService: CommunityService,
    private roleSetService: RoleSetService,
    private conversationService: ConversationService,
    private roomService: RoomService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async communicationMembership(
    communicationData: CommunicationAdminMembershipInput
  ): Promise<CommunicationAdminMembershipResult> {
    this.logger.verbose?.(
      `communicationRoomMembership: ${communicationData.communityID}`,
      LogContext.COMMUNICATION
    );
    const community = await this.communityService.getCommunityOrFail(
      communicationData.communityID,
      {
        relations: {
          roleSet: true,
        },
      }
    );
    const communityMembers = await this.roleSetService.getUsersWithRole(
      community.roleSet,
      RoleName.MEMBER
    );
    const communication = await this.communityService.getCommunication(
      community.id,
      { communication: { updates: true } }
    );

    const result = new CommunicationAdminMembershipResult(
      communication.id,
      communication.displayName
    );
    const updates = this.communicationService.getUpdates(communication);
    const updatesResult = await this.createCommunicationAdminRoomResult(
      updates,
      communityMembers
    );
    result.rooms.push(updatesResult);

    return result;
  }

  private async createCommunicationAdminRoomResult(
    room: IRoom,
    communityMembers: IUser[]
  ): Promise<CommunicationAdminRoomMembershipResult> {
    const result = new CommunicationAdminRoomMembershipResult(
      room.id,
      room.displayName
    );
    result.roomID = room.id;
    // Use getRoomMembers for efficient membership-only lookup (no message history)
    result.members = await this.communicationAdapter.getRoomMembers(room.id);
    // check which ones are missing - compare using agent.id (actorID)
    for (const communityMember of communityMembers) {
      const memberActorID = communityMember.id;
      const inCommunicationRoom = result.members.find(
        roomMember => roomMember === memberActorID
      );
      if (!inCommunicationRoom) {
        result.missingMembers.push(memberActorID);
      }
    }

    // check which ones are extra - compare using entity id (which IS the actorID)
    for (const roomMember of result.members) {
      const inCommunity = communityMembers.find(
        communityMember => communityMember.id === roomMember
      );
      if (!inCommunity) {
        result.extraMembers.push(roomMember);
      }
    }

    return result;
  }

  async ensureCommunityAccessToCommunications(
    communicationData: CommunicationAdminEnsureAccessInput
  ): Promise<boolean> {
    this.logger.verbose?.(
      `communication admin ensure community access to communication: ${communicationData.communityID}`,
      LogContext.COMMUNICATION
    );
    const community = await this.communityService.getCommunityOrFail(
      communicationData.communityID,
      {
        relations: {
          roleSet: true,
        },
      }
    );
    const communication = await this.communityService.getCommunication(
      community.id
    );
    const communityMembers = await this.roleSetService.getUsersWithRole(
      community.roleSet,
      RoleName.MEMBER
    );
    for (const communityMember of communityMembers) {
      await this.communicationService.addContributorToCommunications(
        communication,
        communityMember.id
      );
    }
    return true;
  }

  async updateRoomState(
    roomID: string,
    joinRule: JoinRule,
    _isWorldVisible: boolean
  ) {
    await this.communicationAdapter.updateRoom(
      roomID,
      undefined,
      undefined,
      joinRule
    );
    return await this.communicationAdapter.getRoom(roomID);
  }

  async removeOrphanedRoom(
    orphanedRoomData: CommunicationAdminRemoveOrphanedRoomInput
  ): Promise<boolean> {
    const orphanedRoomID = orphanedRoomData.roomID;
    const roomsUsed = await this.getRoomsUsed();
    const roomInUse = roomsUsed.find(roomID => roomID === orphanedRoomID);
    if (roomInUse) {
      throw new ValidationException(
        `Unable to remove orphaned room as it is used: ${orphanedRoomID}`,
        LogContext.COMMUNICATION
      );
    }
    return await this.communicationAdapter.deleteRoom(orphanedRoomID);
  }

  /**
   * Find Room rows whose Matrix room is missing (the state left behind when
   * `communication.room.create` failed after the row was saved) and re-create
   * each one. The create request is rebuilt from the row (id, type, display
   * name, avatar) plus what its owner supplied at creation time: parent space
   * for callout / post rooms, public join rule for forum discussions, members
   * for conversations.
   *
   * Without `roomIDs` every Room row older than the in-flight grace period is
   * compared against the adapter's room list; only the unlisted ones are
   * examined. Each examined room is probed again before anything is sent, so
   * the pass is idempotent and never sends a create for an existing room.
   *
   * A failure for one room never stops the others, except a transport failure
   * (adapter unreachable): that aborts the pass rather than waiting out one
   * RPC timeout per remaining room.
   */
  async regenerateMissingRooms(
    regenerateData: CommunicationAdminRegenerateMissingRoomsInput
  ): Promise<CommunicationAdminRegenerateMissingRoomsResult> {
    const result = new CommunicationAdminRegenerateMissingRoomsResult();
    const candidates = await this.getRoomsToExamine(regenerateData, result);

    for (const room of candidates) {
      try {
        // The context is resolved only once the room is known to be missing,
        // so a room that cannot be re-created but exists is not a failure.
        const created = await this.roomService.ensureExternalRoom(room, () =>
          this.getRoomCreationContext(room)
        );
        if (created) {
          result.regenerated++;
        } else {
          result.alreadyExisted++;
        }
        result.rooms.push({
          roomID: room.id,
          type: room.type,
          outcome: created
            ? CommunicationAdminRoomRegenerationOutcome.REGENERATED
            : CommunicationAdminRoomRegenerationOutcome.ALREADY_EXISTED,
        });
      } catch (error: unknown) {
        result.failed++;
        result.rooms.push({
          roomID: room.id,
          type: room.type,
          outcome: CommunicationAdminRoomRegenerationOutcome.FAILED,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logger.error(
          {
            message: 'communication admin: unable to regenerate missing room',
            details: { roomId: room.id, roomType: room.type },
          },
          (error as Error)?.stack,
          LogContext.COMMUNICATION
        );
        if (isTransportError(error)) {
          result.aborted = true;
          break;
        }
      }
    }

    this.logger.verbose?.(
      {
        message: 'communication admin: regenerate missing rooms finished',
        details: {
          regenerated: result.regenerated,
          alreadyExisted: result.alreadyExisted,
          failed: result.failed,
          aborted: result.aborted,
        },
      },
      LogContext.COMMUNICATION
    );
    return result;
  }

  /**
   * The Room rows to probe one by one. Rooms that need no individual probe
   * (listed by the adapter) or cannot be probed (unknown ID) are accounted for
   * on `result` here.
   */
  private async getRoomsToExamine(
    regenerateData: CommunicationAdminRegenerateMissingRoomsInput,
    result: CommunicationAdminRegenerateMissingRoomsResult
  ): Promise<Room[]> {
    const requestedIDs = regenerateData.roomIDs;
    // An explicit list - even an empty one - never widens to the platform-wide
    // scan; only an omitted list does.
    if (requestedIDs) {
      const uniqueIDs = [...new Set(requestedIDs)];
      if (uniqueIDs.length === 0) {
        return [];
      }
      const rooms = await this.entityManager.find(Room, {
        where: { id: In(uniqueIDs) },
        loadEagerRelations: false,
      });
      const foundIDs = new Set(rooms.map(room => room.id));
      for (const roomID of uniqueIDs) {
        if (!foundIDs.has(roomID)) {
          result.failed++;
          result.rooms.push({
            roomID,
            outcome: CommunicationAdminRoomRegenerationOutcome.FAILED,
            error: 'Room not found',
          });
        }
      }
      return rooms;
    }

    // Skip rows young enough to still be mid-creation: `createRoom` saves the
    // row before its create RPC returns, and Element-originated rooms
    // (`createRoomFromExternal`) get their Matrix room from Synapse, where an
    // outbound create would collide.
    const createdBefore = new Date(Date.now() - IN_FLIGHT_GRACE_PERIOD_MS);
    const rooms = await this.entityManager.find(Room, {
      where: { createdDate: LessThan(createdBefore) },
      loadEagerRelations: false,
    });
    const matrixRoomIDs = new Set(await this.communicationAdapter.listRooms());
    const unlisted = rooms.filter(room => !matrixRoomIDs.has(room.id));
    result.alreadyExisted += rooms.length - unlisted.length;
    return unlisted;
  }

  /**
   * The owner-derived part of the room creation request, mirroring what each
   * owner passes to `RoomService.createRoom`.
   */
  private async getRoomCreationContext(
    room: IRoom
  ): Promise<Omit<CreateRoomInput, 'displayName' | 'type' | 'avatarUrl'>> {
    switch (room.type) {
      case RoomType.CALLOUT:
        return { parentContextId: await this.getCalloutRoomSpaceId(room.id) };
      case RoomType.POST:
        return { parentContextId: await this.getPostRoomSpaceId(room.id) };
      case RoomType.DISCUSSION_FORUM:
        return { joinRule: JoinRulePublic, isPublic: true };
      case RoomType.CONVERSATION_DIRECT:
      case RoomType.CONVERSATION_GROUP:
        return this.getConversationRoomMembers(room);
      case RoomType.UPDATES:
      case RoomType.CALENDAR_EVENT:
        // created without parent or members
        return {};
      default:
        // Legacy CONVERSATION rooms are no longer created and the adapter's
        // create is idempotent on the room alias, so a wrongly shaped room
        // could not be corrected afterwards. Refuse rather than guess.
        throw new ValidationException(
          'Unable to regenerate room: unsupported room type',
          LogContext.COMMUNICATION,
          { roomId: room.id, roomType: room.type }
        );
    }
  }

  /**
   * Space owning the callout whose comments room this is. Undefined when the
   * callout is not in a space (e.g. a knowledge base), exactly as at creation.
   */
  private async getCalloutRoomSpaceId(
    roomID: string
  ): Promise<string | undefined> {
    const result = await this.entityManager
      .createQueryBuilder()
      .select('s.id', 'spaceId')
      .from('callout', 'co')
      .innerJoin('collaboration', 'c', 'c."calloutsSetId" = co."calloutsSetId"')
      .innerJoin('space', 's', 's."collaborationId" = c.id')
      .where('co."commentsId" = :roomID', { roomID })
      .getRawOne<{ spaceId: string }>();
    return result?.spaceId;
  }

  /** Space owning the callout that holds the post whose comments room this is. */
  private async getPostRoomSpaceId(
    roomID: string
  ): Promise<string | undefined> {
    const result = await this.entityManager
      .createQueryBuilder()
      .select('s.id', 'spaceId')
      .from('post', 'p')
      .innerJoin('callout_contribution', 'cc', 'cc."postId" = p.id')
      .innerJoin('callout', 'co', 'co.id = cc."calloutId"')
      .innerJoin('collaboration', 'c', 'c."calloutsSetId" = co."calloutsSetId"')
      .innerJoin('space', 's', 's."collaborationId" = c.id')
      .where('p."commentsId" = :roomID', { roomID })
      .getRawOne<{ spaceId: string }>();
    return result?.spaceId;
  }

  private async getConversationRoomMembers(
    room: IRoom
  ): Promise<
    Pick<
      CreateRoomInput,
      'senderActorID' | 'receiverActorID' | 'memberActorIDs'
    >
  > {
    const conversation =
      await this.conversationService.findConversationByRoomId(room.id);
    if (!conversation) {
      throw new ValidationException(
        'Unable to regenerate conversation room: no conversation uses it',
        LogContext.COMMUNICATION_CONVERSATION,
        { roomId: room.id, roomType: room.type }
      );
    }
    const members = await this.conversationService.getConversationMembers(
      conversation.id
    );
    const memberActorIDs = members.map(member => member.actorID);

    if (room.type === RoomType.CONVERSATION_GROUP) {
      // The adapter's create is idempotent on the room alias, so a room
      // created with nobody in it would never get its members from a later pass.
      if (memberActorIDs.length === 0) {
        throw new ValidationException(
          'Unable to regenerate group conversation room: no members',
          LogContext.COMMUNICATION_CONVERSATION,
          { roomId: room.id, conversationId: conversation.id }
        );
      }
      return { memberActorIDs };
    }
    if (memberActorIDs.length !== 2) {
      throw new ValidationException(
        'Unable to regenerate direct conversation room: expected exactly 2 members',
        LogContext.COMMUNICATION_CONVERSATION,
        {
          roomId: room.id,
          conversationId: conversation.id,
          memberCount: memberActorIDs.length,
        }
      );
    }
    return {
      senderActorID: memberActorIDs[0],
      receiverActorID: memberActorIDs[1],
    };
  }

  async orphanedUsage(): Promise<CommunicationAdminOrphanedUsageResult> {
    this.logger.verbose?.(
      'communication admin checking for orphaned usage.',
      LogContext.COMMUNICATION
    );
    const result = new CommunicationAdminOrphanedUsageResult();
    const roomsUsed = await this.getRoomsUsed();

    // Get all the rooms used in Matrix + filter to only create results for those not used
    const matrixRoomIds = await this.communicationAdapter.listRooms();
    for (const matrixRoomId of matrixRoomIds) {
      const found = roomsUsed.find(roomID => roomID === matrixRoomId);
      if (!found) {
        const roomNotUsed =
          await this.communicationAdapter.getRoom(matrixRoomId);
        const roomResult = new CommunicationAdminRoomResult(
          roomNotUsed.id,
          roomNotUsed.displayName
        );
        roomResult.members = roomNotUsed.members;
        result.rooms.push(roomResult);
      }
    }

    this.logger.verbose?.(
      `communication admin: found ${roomsUsed.length} rooms used; found ${matrixRoomIds.length} rooms in Matrix; found ${result.rooms.length} rooms not used`,
      LogContext.COMMUNICATION
    );

    return result;
  }

  private async getRoomsUsed(): Promise<string[]> {
    const communicationIDs =
      await this.communicationService.getCommunicationIDsUsed();
    let roomsUsed: string[] = [];
    for (const communicationID of communicationIDs) {
      const communication =
        await this.communicationService.getCommunicationOrFail(communicationID);
      const communicationRoomsUsed =
        this.communicationService.getRoomIds(communication);
      roomsUsed = roomsUsed.concat(communicationRoomsUsed);
    }
    return roomsUsed;
  }

  /**
   * Migrate legacy conversations by creating rooms for those that don't have one.
   * This handles orphaned conversations from the "lazy room creation" era.
   * @returns Migration result with counts and any errors encountered
   */
  async migrateConversationRooms(): Promise<CommunicationAdminMigrateRoomsResult> {
    const result = new CommunicationAdminMigrateRoomsResult();

    const conversationsWithoutRooms =
      await this.conversationService.findConversationsWithoutRooms();

    this.logger.verbose?.(
      `Found ${conversationsWithoutRooms.length} conversations without rooms to migrate`,
      LogContext.COMMUNICATION
    );

    for (const conversation of conversationsWithoutRooms) {
      try {
        const room =
          await this.conversationService.ensureRoomExists(conversation);
        if (room) {
          result.migrated++;
          this.logger.verbose?.(
            `Migrated conversation ${conversation.id} - created room ${room.id}`,
            LogContext.COMMUNICATION
          );
        } else {
          result.failed++;
          result.errors.push(
            `Conversation ${conversation.id}: room creation returned undefined`
          );
        }
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push(`Conversation ${conversation.id}: ${errorMessage}`);
        this.logger.warn(
          `Failed to migrate conversation ${conversation.id}: ${errorMessage}`,
          LogContext.COMMUNICATION
        );
      }
    }

    this.logger.verbose?.(
      `Migration complete: ${result.migrated} migrated, ${result.failed} failed`,
      LogContext.COMMUNICATION
    );

    return result;
  }
}
