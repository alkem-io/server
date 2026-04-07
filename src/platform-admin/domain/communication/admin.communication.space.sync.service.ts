import { JoinRuleInvite, JoinRulePublic } from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { FORUM_CATEGORY_NAMESPACE } from '@constants/forum.constants';
import { Room } from '@domain/communication/room/room.entity';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Space } from '@domain/space/space/space.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

// Throttle: pause after every adapter call to avoid overwhelming the Matrix adapter.
// Each RPC call goes through AMQP with a 30s timeout; sending too many in parallel
// causes cascading timeouts on the adapter side.
const THROTTLE_DELAY_MS = 200;

@Injectable()
export class AdminCommunicationSpaceSyncService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(Forum)
    private forumRepository: Repository<Forum>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(VirtualContributor)
    private vcRepository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Synchronize all Alkemio spaces into the Matrix space hierarchy.
   * Idempotent — safe to call multiple times.
   *
   * Two-pass approach:
   *   Pass 1: Create all Matrix spaces (L0 → L1 → L2, then forum/category spaces)
   *   Pass 2: Anchor all rooms to their owning Matrix spaces
   */
  async syncSpaceHierarchy(): Promise<boolean> {
    this.logger.verbose?.(
      'Starting Matrix space hierarchy synchronization',
      LogContext.COMMUNICATION
    );

    const spaces = await this.spaceRepository.find({
      order: { level: 'ASC' },
      relations: {
        parentSpace: true,
        about: {
          profile: {
            visuals: true,
          },
        },
        community: {
          communication: {
            updates: true,
          },
        },
      },
    });

    this.logger.verbose?.(
      `Found ${spaces.length} spaces to sync`,
      LogContext.COMMUNICATION
    );

    // === Pass 1: Create all Matrix spaces ===
    let spacesCreated = 0;
    let spacesSkipped = 0;
    let spacesFailed = 0;

    for (const space of spaces) {
      try {
        const displayName = space.about?.profile?.displayName || space.nameID;
        const avatarVisual = space.about?.profile?.visuals?.find(
          (v: { name: string }) => v.name === 'avatar'
        );
        const avatarUrl = avatarVisual?.uri || undefined;

        const existing = await this.communicationAdapter.getSpace(space.id);
        if (!existing) {
          await this.communicationAdapter.createSpace(
            space.id,
            displayName,
            space.parentSpace?.id,
            avatarUrl,
            JoinRuleInvite
          );
          spacesCreated++;
          this.logger.verbose?.(
            `Created Matrix space for: ${space.id} (${displayName})`,
            LogContext.COMMUNICATION
          );
        } else {
          // Update existing space with current displayName and avatar
          await this.communicationAdapter.updateSpace(
            space.id,
            displayName,
            undefined,
            avatarUrl
          );
          spacesSkipped++;
        }
        await this.throttle();
      } catch (_error) {
        spacesFailed++;
        this.logger.warn?.(
          `Failed to create Matrix space for ${space.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
    }

    // Create forum/category Matrix spaces
    await this.syncForumSpaces();

    // === Pass 2: Anchor all rooms ===
    let roomsAnchored = 0;
    let roomsFailed = 0;

    for (const space of spaces) {
      // Anchor UPDATES room
      const updatesRoom = space.community?.communication?.updates;
      if (updatesRoom) {
        try {
          await this.communicationAdapter.setParent(
            updatesRoom.id,
            false,
            space.id
          );
          roomsAnchored++;
          await this.throttle();
        } catch (_error) {
          roomsFailed++;
          this.logger.warn?.(
            `Failed to anchor updates room ${updatesRoom.id} to space ${space.id}`,
            LogContext.COMMUNICATION
          );
        }
      }
    }

    // Anchor callout and post rooms to their owning space
    const anchorResult = await this.syncCalloutAndPostRoomAnchoring();
    roomsAnchored += anchorResult.anchored;
    roomsFailed += anchorResult.failed;

    // Anchor forum discussion rooms
    await this.syncForumRoomAnchoring();

    // Erase display names on direct conversation rooms so Matrix shows member names
    await this.syncDirectConversationNames();

    // Sync actor display names to Matrix for all users and VCs
    await this.syncActorDisplayNames();

    // Ensure io.alkemio.visibility custom state is correct on all rooms and spaces
    await this.syncVisibilityState();

    this.logger.verbose?.(
      `Matrix space hierarchy sync complete: spaces(${spacesCreated} created, ${spacesSkipped} existed, ${spacesFailed} failed), rooms(${roomsAnchored} anchored, ${roomsFailed} failed)`,
      LogContext.COMMUNICATION
    );

    return true;
  }

  /**
   * Pass 1b: Create forum and category Matrix spaces.
   */
  private async syncForumSpaces(): Promise<void> {
    const forums = await this.forumRepository.find({
      relations: {
        discussions: true,
      },
    });

    for (const forum of forums) {
      try {
        const existingForum = await this.communicationAdapter.getSpace(
          forum.id
        );
        if (!existingForum) {
          await this.communicationAdapter.createSpace(
            forum.id,
            'Forum',
            undefined,
            undefined,
            JoinRulePublic,
            true
          );
          this.logger.verbose?.(
            `Created Matrix space for forum: ${forum.id}`,
            LogContext.COMMUNICATION
          );
        } else {
          // Ensure existing forum space has correct visibility
          await this.communicationAdapter.updateSpace(
            forum.id,
            undefined,
            undefined,
            undefined,
            JoinRulePublic,
            true
          );
        }

        await this.throttle();

        this.logger.verbose?.(
          `Forum ${forum.id}: ${forum.discussions?.length ?? 0} discussions, defined categories: [${forum.discussionCategories}]`,
          LogContext.COMMUNICATION
        );

        // Create category spaces for ALL defined categories on the forum
        const categories = forum.discussionCategories ?? [];
        for (const category of categories) {
          const categoryContextId = uuidv5(
            `${forum.id}:category:${category}`,
            FORUM_CATEGORY_NAMESPACE
          );
          const existingCategory =
            await this.communicationAdapter.getSpace(categoryContextId);
          if (!existingCategory) {
            await this.communicationAdapter.createSpace(
              categoryContextId,
              category,
              forum.id,
              undefined,
              JoinRulePublic,
              true
            );
            this.logger.verbose?.(
              `Created Matrix space for forum category: ${category} (${categoryContextId})`,
              LogContext.COMMUNICATION
            );
          } else {
            // Ensure existing category space has correct visibility
            await this.communicationAdapter.updateSpace(
              categoryContextId,
              undefined,
              undefined,
              undefined,
              JoinRulePublic,
              true
            );
            this.logger.verbose?.(
              `Updated visibility for forum category: ${category} (${categoryContextId})`,
              LogContext.COMMUNICATION
            );
          }
          await this.throttle();
        }
      } catch (_error) {
        this.logger.warn?.(
          `Failed to sync forum spaces for forum ${forum.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
    }
  }

  /**
   * Pass 2b: Anchor forum discussion rooms under their category Matrix spaces.
   */
  private async syncForumRoomAnchoring(): Promise<void> {
    const forums = await this.forumRepository.find({
      relations: {
        discussions: {
          comments: true,
          profile: true,
        },
      },
    });

    for (const forum of forums) {
      if (!forum.discussions) continue;

      for (const discussion of forum.discussions) {
        if (!discussion.comments) continue;

        const categoryContextId = uuidv5(
          `${forum.id}:category:${discussion.category}`,
          FORUM_CATEGORY_NAMESPACE
        );

        try {
          await this.communicationAdapter.setParent(
            discussion.comments.id,
            false,
            categoryContextId
          );
          // Ensure discussion room is public, visible in directory, with clean display name
          await this.communicationAdapter.updateRoom(
            discussion.comments.id,
            discussion.profile?.displayName,
            undefined,
            JoinRulePublic,
            undefined,
            true
          );
          await this.throttle();
        } catch (_error) {
          this.logger.warn?.(
            `Failed to anchor/update discussion room ${discussion.comments.id} — skipping`,
            LogContext.COMMUNICATION
          );
        }
      }
    }
  }

  /**
   * Pass 2c: Anchor callout and post rooms to their owning space's Matrix space.
   * Uses raw queries to traverse: Space → Collaboration → CalloutsSet → Callout → Room
   * and Space → Collaboration → CalloutsSet → Callout → Contribution → Post → Room.
   */
  private async syncCalloutAndPostRoomAnchoring(): Promise<{
    anchored: number;
    failed: number;
  }> {
    let anchored = 0;
    let failed = 0;

    // Callout comment rooms → owning space
    const calloutRooms: { roomId: string; spaceId: string }[] =
      await this.roomRepository.manager
        .createQueryBuilder()
        .select('r.id', 'roomId')
        .addSelect('s.id', 'spaceId')
        .from('room', 'r')
        .innerJoin('callout', 'cal', 'cal."commentsId" = r.id')
        .innerJoin('callouts_set', 'cs', 'cs.id = cal."calloutsSetId"')
        .innerJoin('collaboration', 'col', 'col."calloutsSetId" = cs.id')
        .innerJoin('space', 's', 's."collaborationId" = col.id')
        .getRawMany();

    this.logger.verbose?.(
      `Anchoring ${calloutRooms.length} callout rooms to spaces`,
      LogContext.COMMUNICATION
    );

    for (const { roomId, spaceId } of calloutRooms) {
      try {
        await this.communicationAdapter.setParent(roomId, false, spaceId);
        anchored++;
        await this.throttle();
      } catch (_error) {
        failed++;
        this.logger.warn?.(
          `Failed to anchor callout room ${roomId} to space ${spaceId}`,
          LogContext.COMMUNICATION
        );
      }
    }

    // Post comment rooms → owning space
    const postRooms: { roomId: string; spaceId: string }[] =
      await this.roomRepository.manager
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
        .getRawMany();

    this.logger.verbose?.(
      `Anchoring ${postRooms.length} post rooms to spaces`,
      LogContext.COMMUNICATION
    );

    for (const { roomId, spaceId } of postRooms) {
      try {
        await this.communicationAdapter.setParent(roomId, false, spaceId);
        anchored++;
        await this.throttle();
      } catch (_error) {
        failed++;
        this.logger.warn?.(
          `Failed to anchor post room ${roomId} to space ${spaceId}`,
          LogContext.COMMUNICATION
        );
      }
    }

    return { anchored, failed };
  }

  /**
   * Erase display names on direct conversation rooms so Matrix
   * shows each participant the other member's display name.
   */
  private async syncDirectConversationNames(): Promise<void> {
    const directRooms = await this.roomRepository.find({
      where: { type: RoomType.CONVERSATION_DIRECT },
    });

    this.logger.verbose?.(
      `Erasing display names on ${directRooms.length} direct conversation rooms`,
      LogContext.COMMUNICATION
    );

    for (const room of directRooms) {
      try {
        await this.communicationAdapter.updateRoom(
          room.id,
          '' // Empty string = erase name
        );
        await this.throttle();
      } catch (_error) {
        this.logger.warn?.(
          `Failed to erase display name for direct room ${room.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
    }
  }

  /**
   * Sync display names to Matrix for all users and virtual contributors.
   */
  private async syncActorDisplayNames(): Promise<void> {
    const users = await this.userRepository.find();
    const vcs = await this.vcRepository.find({
      relations: { profile: true },
    });

    this.logger.verbose?.(
      `Syncing display names for ${users.length} users and ${vcs.length} virtual contributors`,
      LogContext.COMMUNICATION
    );

    let synced = 0;
    for (const user of users) {
      const displayName =
        `${user.firstName} ${user.lastName}`.trim() || user.email;
      try {
        await this.communicationAdapter.syncActor(user.id, displayName);
        synced++;
        await this.throttle();
      } catch (_error) {
        this.logger.warn?.(
          `Failed to sync display name for user ${user.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
    }

    for (const vc of vcs) {
      const displayName = vc.profile?.displayName || vc.nameID;
      try {
        await this.communicationAdapter.syncActor(vc.id, displayName);
        synced++;
        await this.throttle();
      } catch (_error) {
        this.logger.warn?.(
          `Failed to sync display name for VC ${vc.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
    }

    this.logger.verbose?.(
      `Synced display names for ${synced} actors`,
      LogContext.COMMUNICATION
    );
  }

  /**
   * Ensure io.alkemio.visibility custom state is correct on all rooms and spaces.
   * Conversation rooms (conversation, direct, group) → visible: true
   * All other rooms and ALL spaces → visible: false
   * Only updates if the current state is missing or incorrect.
   */
  private async syncVisibilityState(): Promise<void> {
    // === Rooms ===
    const allRooms = await this.roomRepository.find();

    this.logger.verbose?.(
      `Checking io.alkemio.visibility state on ${allRooms.length} rooms`,
      LogContext.COMMUNICATION
    );

    let roomsUpdated = 0;
    for (const room of allRooms) {
      const isConversation =
        room.type === RoomType.CONVERSATION ||
        room.type === RoomType.CONVERSATION_DIRECT ||
        room.type === RoomType.CONVERSATION_GROUP;
      const expectedVisible = isConversation;

      try {
        const currentState = await this.communicationAdapter.getRoomState(
          room.id,
          ['io.alkemio.visibility']
        );

        const currentVisible = currentState?.['io.alkemio.visibility']?.visible;

        if (currentVisible === expectedVisible) continue;

        await this.communicationAdapter.setRoomState(room.id, {
          'io.alkemio.visibility': { visible: expectedVisible },
        });
        roomsUpdated++;
      } catch (_error) {
        this.logger.warn?.(
          `Failed to sync visibility state for room ${room.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
      await this.throttle();
    }

    // === Spaces (all invisible) ===
    const allSpaces = await this.spaceRepository.find();
    const forums = await this.forumRepository.find({
      relations: { discussions: true },
    });

    // Collect all space context IDs: alkemio spaces + forum + category spaces
    const spaceContextIds: string[] = allSpaces.map(s => s.id);
    for (const forum of forums) {
      spaceContextIds.push(forum.id);
      for (const category of forum.discussionCategories ?? []) {
        spaceContextIds.push(
          uuidv5(`${forum.id}:category:${category}`, FORUM_CATEGORY_NAMESPACE)
        );
      }
    }

    let spacesUpdated = 0;
    for (const contextId of spaceContextIds) {
      try {
        const currentState = await this.communicationAdapter.getSpaceState(
          contextId,
          ['io.alkemio.visibility']
        );

        const currentVisible = currentState?.['io.alkemio.visibility']?.visible;

        if (currentVisible === false) continue;

        await this.communicationAdapter.setSpaceState(contextId, {
          'io.alkemio.visibility': { visible: false },
        });
        spacesUpdated++;
      } catch (_error) {
        this.logger.warn?.(
          `Failed to sync visibility state for space ${contextId} — skipping`,
          LogContext.COMMUNICATION
        );
      }
      await this.throttle();
    }

    this.logger.verbose?.(
      `Updated io.alkemio.visibility: ${roomsUpdated} rooms, ${spacesUpdated} spaces`,
      LogContext.COMMUNICATION
    );
  }

  /**
   * Throttle adapter calls: pause after every operation to avoid overwhelming
   * the Matrix adapter with AMQP RPC calls.
   */
  private async throttle(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY_MS));
  }
}
