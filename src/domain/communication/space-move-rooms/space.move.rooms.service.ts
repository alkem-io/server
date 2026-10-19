import { LogContext } from '@common/enums/logging.context';
import { RoomType } from '@common/enums/room.type';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { RoomService } from '@domain/communication/room/room.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';

interface CommunicationWithUpdatesRoom {
  communicationId: string;
  updatesRoomId: string;
  spaceId: string;
  displayName: string;
}

@Injectable()
export class SpaceMoveRoomsService {
  constructor(
    private readonly spaceLookupService: SpaceLookupService,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly roomService: RoomService,
    private readonly communicationService: CommunicationService,
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Orchestrates all room-related operations during a cross-L0 space move.
   *
   * Called AFTER the database transaction for the space move has committed
   * and community memberships have been cleared.
   *
   * Operations (fire-and-forget for adapter calls):
   * 1. Collect all room IDs in the moved subtree
   * 2. Revoke Matrix room memberships for all removed actors
   * 3. Recreate community updates rooms for the moved space and descendants
   *
   * Matrix space memberships are not revoked: the server adds no actor to a
   * Matrix space, and no room's join rule depends on Matrix space membership —
   * every member is added to each room directly.
   */
  async handleRoomsDuringMove(
    movedSpaceId: string,
    removedActorIds: string[]
  ): Promise<void> {
    try {
      const descendantSpaceIds =
        await this.spaceLookupService.getAllDescendantSpaceIDs(movedSpaceId);
      const allSpaceIds = [movedSpaceId, ...descendantSpaceIds];

      // Step 1: Collect all room IDs in the subtree
      const roomIds = await this.collectAllRoomIdsInSubtree(allSpaceIds);

      // Step 2: Revoke room memberships for removed actors
      if (removedActorIds.length > 0 && roomIds.length > 0) {
        this.revokeRoomMembershipsForActors(removedActorIds, roomIds);
      }

      // Step 3: Recreate updates rooms
      // PRESERVATION VERIFICATION (US1):
      //  - collectAllRoomIdsInSubtree() is read-only (no DELETE/UPDATE on room table)
      //  - revokeRoomMembershipsForActors only calls batchRemoveMember
      //    (membership op), never deleteRoom
      //  - Only updates rooms are deleted below (via recreateUpdatesRooms); callout/post
      //    rooms survive untouched with full message history and original attribution
      //  - Room.messagesCount is adapter-derived at query time, not a stale cache
      const communications =
        await this.getCommunicationsWithUpdatesRooms(allSpaceIds);
      await this.recreateUpdatesRooms(communications);

      this.logger.verbose?.(
        {
          message: 'Room handling during move completed',
          movedSpaceId,
          actorCount: removedActorIds.length,
          roomCount: roomIds.length,
          spacesInSubtree: allSpaceIds.length,
        },
        LogContext.COMMUNICATION
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error?.(
        {
          message: 'Failed to handle rooms during space move',
          movedSpaceId,
          actorCount: removedActorIds.length,
        },
        err?.stack,
        LogContext.COMMUNICATION
      );
      // Never throw — method must not block the caller
    }
  }

  /**
   * Collects all room IDs (callout, post, updates) across the entire space subtree.
   * Uses three separate queries joined via the entity graph.
   */
  async collectAllRoomIdsInSubtree(spaceIds: string[]): Promise<string[]> {
    if (spaceIds.length === 0) return [];

    const [calloutRoomIds, postRoomIds, updatesRoomIds] = await Promise.all([
      // Callout discussion rooms: Room ← Callout ← CalloutsSet ← Collaboration ← Space
      this.entityManager
        .createQueryBuilder()
        .select('r.id', 'id')
        .from('room', 'r')
        .innerJoin('callout', 'c', 'c."commentsId" = r.id')
        .innerJoin('callouts_set', 'cs', 'cs.id = c."calloutsSetId"')
        .innerJoin('collaboration', 'col', 'col."calloutsSetId" = cs.id')
        .innerJoin('space', 's', 's."collaborationId" = col.id')
        .where('s.id IN (:...spaceIds)', { spaceIds })
        .getRawMany<{ id: string }>(),

      // Post comment rooms: Room ← Post ← CalloutContribution ← Callout ← CalloutsSet ← Collaboration ← Space
      this.entityManager
        .createQueryBuilder()
        .select('r.id', 'id')
        .from('room', 'r')
        .innerJoin('post', 'p', 'p."commentsId" = r.id')
        .innerJoin('callout_contribution', 'cc', 'cc."postId" = p.id')
        .innerJoin('callout', 'c', 'c.id = cc."calloutId"')
        .innerJoin('callouts_set', 'cs', 'cs.id = c."calloutsSetId"')
        .innerJoin('collaboration', 'col', 'col."calloutsSetId" = cs.id')
        .innerJoin('space', 's', 's."collaborationId" = col.id')
        .where('s.id IN (:...spaceIds)', { spaceIds })
        .getRawMany<{ id: string }>(),

      // Updates rooms: Room ← Communication ← Community ← Space
      this.entityManager
        .createQueryBuilder()
        .select('r.id', 'id')
        .from('room', 'r')
        .innerJoin('communication', 'comm', 'comm."updatesId" = r.id')
        .innerJoin('community', 'cmty', 'cmty."communicationId" = comm.id')
        .innerJoin('space', 's', 's."communityId" = cmty.id')
        .where('s.id IN (:...spaceIds)', { spaceIds })
        .getRawMany<{ id: string }>(),
    ]);

    const allIds = new Set<string>();
    for (const row of [...calloutRoomIds, ...postRoomIds, ...updatesRoomIds]) {
      allIds.add(row.id);
    }

    return Array.from(allIds);
  }

  /**
   * Retrieves Communication entities with their updates room info for the given spaces.
   * Used to delete old and create new updates rooms during the move.
   * The owning space is resolved through its community, never through
   * communication."spaceID", which does not hold the owning space's id.
   */
  async getCommunicationsWithUpdatesRooms(
    spaceIds: string[]
  ): Promise<CommunicationWithUpdatesRoom[]> {
    if (spaceIds.length === 0) return [];

    const rows = await this.entityManager
      .createQueryBuilder()
      .select('comm.id', 'communicationId')
      .addSelect('comm."updatesId"', 'updatesRoomId')
      .addSelect('s.id', 'spaceId')
      .addSelect('comm."displayName"', 'displayName')
      .from('communication', 'comm')
      .innerJoin('community', 'cmty', 'cmty."communicationId" = comm.id')
      .innerJoin('space', 's', 's."communityId" = cmty.id')
      .where('s.id IN (:...spaceIds)', { spaceIds })
      .andWhere('comm."updatesId" IS NOT NULL')
      .getRawMany<CommunicationWithUpdatesRoom>();

    return rows;
  }

  /**
   * Revokes room-level Matrix memberships for the given actors across all rooms.
   * Fire-and-forget: errors are logged, never thrown.
   */
  revokeRoomMembershipsForActors(actorIds: string[], roomIds: string[]): void {
    for (const actorId of actorIds) {
      this.communicationAdapter
        .batchRemoveMember(actorId, roomIds, 'cross-L0-move')
        .catch(error =>
          this.logger.error?.(
            {
              message: 'Failed to revoke room memberships for actor',
              details: { actorId, roomCount: roomIds.length },
            },
            error?.stack,
            LogContext.COMMUNICATION
          )
        );
    }
  }

  /**
   * Recreates the community updates room for each Communication in the subtree.
   * Old room is deleted (DB + Matrix), new empty room is created and linked.
   * Each iteration is independent — failure in one space does not prevent others.
   */
  async recreateUpdatesRooms(
    communications: CommunicationWithUpdatesRoom[]
  ): Promise<void> {
    for (const comm of communications) {
      try {
        // 1. Delete old updates room (removes DB entity + Matrix room)
        await this.roomService.deleteRoom({ roomID: comm.updatesRoomId });

        // 2. Create new empty updates room
        const newRoom = await this.roomService.createRoom({
          displayName: `updates-${comm.displayName}`,
          type: RoomType.UPDATES,
        });

        // 3. Update Communication entity to point to the new room
        const communication =
          await this.communicationService.getCommunicationOrFail(
            comm.communicationId
          );
        communication.updates = newRoom;
        await this.communicationService.save(communication);
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error?.(
          {
            message:
              'Failed to recreate updates room — space may be left without an updates room',
            details: {
              communicationId: comm.communicationId,
              spaceId: comm.spaceId,
              updatesRoomId: comm.updatesRoomId,
            },
          },
          err?.stack,
          LogContext.COMMUNICATION
        );
      }
    }
  }
}
