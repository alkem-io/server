import { JoinRuleInvite, JoinRulePublic } from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { Room } from '@domain/communication/room/room.entity';
import { Space } from '@domain/space/space/space.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

// Must match the namespace used in ForumService
const FORUM_CATEGORY_NAMESPACE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

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
        const existing = await this.communicationAdapter.getSpace(space.id);
        if (!existing) {
          await this.communicationAdapter.createSpace(
            space.id,
            space.nameID,
            space.parentSpace?.id,
            undefined,
            JoinRuleInvite
          );
          spacesCreated++;
          this.logger.verbose?.(
            `Created Matrix space for: ${space.id} (${space.nameID})`,
            LogContext.COMMUNICATION
          );
        } else {
          spacesSkipped++;
        }
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
        } catch (_error) {
          roomsFailed++;
          this.logger.warn?.(
            `Failed to anchor updates room ${updatesRoom.id} to space ${space.id}`,
            LogContext.COMMUNICATION
          );
        }
      }
    }

    // Anchor forum discussion rooms
    await this.syncForumRoomAnchoring();

    // Erase display names on direct conversation rooms so Matrix shows member names
    await this.syncDirectConversationNames();

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
      } catch (_error) {
        this.logger.warn?.(
          `Failed to erase display name for direct room ${room.id} — skipping`,
          LogContext.COMMUNICATION
        );
      }
    }
  }
}
