import { Injectable, Scope } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import DataLoader from 'dataloader';
import { IMessage } from '../message/message.interface';

/** Composite key for unread count: actorID + roomID */
interface UnreadCountKey {
  actorID: string;
  roomID: string;
}

/**
 * Request-scoped DataLoader for batching room communication data requests.
 * Prevents N+1 queries when resolving lastMessage and unreadCount for multiple rooms.
 *
 * Authorization is handled by the synchronous GraphqlGuard on the resolver.
 * The guard must remain synchronous to preserve DataLoader batching —
 * all .load() calls must land in the same event loop tick.
 */
@Injectable({ scope: Scope.REQUEST })
export class RoomDataLoader {
  private lastMessageLoader: DataLoader<string, IMessage | null>;
  private unreadCountLoader: DataLoader<UnreadCountKey, number, string>;

  constructor(private readonly communicationAdapter: CommunicationAdapter) {
    this.lastMessageLoader = this.createLastMessageLoader();
    this.unreadCountLoader = this.createUnreadCountLoader();
  }

  /**
   * Get the last message for a room using batched loading.
   */
  loadLastMessage(roomId: string): Promise<IMessage | null> {
    return this.lastMessageLoader.load(roomId);
  }

  /**
   * Get the unread count for a room using batched loading.
   * Uses composite key (actorID + roomID) so different actors get separate cache entries.
   */
  loadUnreadCount(roomId: string, actorID: string): Promise<number> {
    return this.unreadCountLoader.load({ actorID, roomID: roomId });
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
