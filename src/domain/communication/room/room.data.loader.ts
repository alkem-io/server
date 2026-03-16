import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable, Scope } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import DataLoader from 'dataloader';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';

/** Composite key for unread count: actorID + roomID */
interface UnreadCountKey {
  actorID: string;
  roomID: string;
}

/**
 * Request-scoped DataLoader for batching room communication data requests.
 * Prevents N+1 queries when resolving lastMessage and unreadCount for multiple rooms.
 *
 * Authorization is enforced synchronously in the load methods (not via async guards)
 * so that all .load() calls within a GraphQL request land in the same event loop tick,
 * allowing DataLoader to batch them into a single RPC call.
 */
@Injectable({ scope: Scope.REQUEST })
export class RoomDataLoader {
  private lastMessageLoader: DataLoader<string, IMessage | null>;
  private unreadCountLoader: DataLoader<UnreadCountKey, number, string>;

  constructor(
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly authorizationService: AuthorizationService
  ) {
    this.lastMessageLoader = this.createLastMessageLoader();
    this.unreadCountLoader = this.createUnreadCountLoader();
  }

  /**
   * Get the last message for a room using batched loading.
   * Checks READ authorization synchronously to preserve DataLoader batching.
   */
  loadLastMessage(
    room: IRoom,
    actorContext: ActorContext
  ): Promise<IMessage | null> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.READ,
      'room lastMessage'
    );
    return this.lastMessageLoader.load(room.id);
  }

  /**
   * Get the unread count for a room using batched loading.
   * Checks READ authorization synchronously to preserve DataLoader batching.
   * Uses composite key (actorID + roomID) so different actors get separate cache entries.
   */
  loadUnreadCount(room: IRoom, actorContext: ActorContext): Promise<number> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.READ,
      'room unreadCount'
    );
    return this.unreadCountLoader.load({
      actorID: actorContext.actorID,
      roomID: room.id,
    });
  }

  private createLastMessageLoader(): DataLoader<string, IMessage | null> {
    return new DataLoader<string, IMessage | null>(
      async (roomIds: readonly string[]) => {
        const results = await this.communicationAdapter.batchGetLastMessages([
          ...roomIds,
        ]);
        return roomIds.map(id => results[id] ?? null);
      },
      {
        cache: true,
        name: 'RoomLastMessageLoader',
      }
    );
  }

  private createUnreadCountLoader(): DataLoader<
    UnreadCountKey,
    number,
    string
  > {
    return new DataLoader<UnreadCountKey, number, string>(
      async (keys: readonly UnreadCountKey[]) => {
        // Group by actorID — typically 1 actor per request,
        // but handles multi-actor correctly
        const byActor = new Map<string, string[]>();
        for (const key of keys) {
          let roomIds = byActor.get(key.actorID);
          if (!roomIds) {
            roomIds = [];
            byActor.set(key.actorID, roomIds);
          }
          roomIds.push(key.roomID);
        }

        // Fetch all actors' unread counts in parallel
        const allResults = new Map<string, Record<string, number>>();
        await Promise.all(
          [...byActor.entries()].map(async ([actorID, roomIds]) => {
            const results =
              await this.communicationAdapter.batchGetUnreadCounts(
                actorID,
                roomIds
              );
            allResults.set(actorID, results);
          })
        );

        // Return results in input key order
        return keys.map(key => allResults.get(key.actorID)?.[key.roomID] ?? 0);
      },
      {
        cache: true,
        cacheKeyFn: (key: UnreadCountKey) => `${key.actorID}:${key.roomID}`,
        name: 'RoomUnreadCountLoader',
      }
    );
  }
}
