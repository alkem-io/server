import { Injectable, Scope } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import DataLoader from 'dataloader';
import { IMessage } from '../message/message.interface';

/**
 * Request-scoped DataLoader for batching room communication data requests.
 * Prevents N+1 queries when resolving lastMessage and unreadCount for multiple rooms.
 */
@Injectable({ scope: Scope.REQUEST })
export class RoomDataLoader {
  private lastMessageLoader: DataLoader<string, IMessage | null>;
  private unreadCountLoaders: Map<string, DataLoader<string, number>> =
    new Map();

  constructor(private readonly communicationAdapter: CommunicationAdapter) {
    this.lastMessageLoader = this.createLastMessageLoader();
  }

  /**
   * Get the last message for a room using batched loading.
   */
  async loadLastMessage(roomId: string): Promise<IMessage | null> {
    return this.lastMessageLoader.load(roomId);
  }

  /**
   * Get the unread count for a room using batched loading.
   * Creates a separate loader per actorId since unread counts are user-specific.
   */
  async loadUnreadCount(roomId: string, actorId: string): Promise<number> {
    let loader = this.unreadCountLoaders.get(actorId);
    if (!loader) {
      loader = this.createUnreadCountLoader(actorId);
      this.unreadCountLoaders.set(actorId, loader);
    }
    return loader.load(roomId);
  }

  private createLastMessageLoader(): DataLoader<string, IMessage | null> {
    return new DataLoader<string, IMessage | null>(
      async (roomIds: readonly string[]) => {
        const results = await this.communicationAdapter.batchGetLastMessages([
          ...roomIds,
        ]);
        // Return results in the same order as input keys
        return roomIds.map(id => results[id] ?? null);
      },
      {
        cache: true,
        name: 'RoomLastMessageLoader',
      }
    );
  }

  private createUnreadCountLoader(actorId: string): DataLoader<string, number> {
    return new DataLoader<string, number>(
      async (roomIds: readonly string[]) => {
        const results = await this.communicationAdapter.batchGetUnreadCounts(
          actorId,
          [...roomIds]
        );
        // Return results in the same order as input keys, defaulting to 0
        return roomIds.map(id => results[id] ?? 0);
      },
      {
        cache: true,
        name: `RoomUnreadCountLoader:${actorId}`,
      }
    );
  }
}
