import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable, Scope } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import DataLoader from 'dataloader';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';

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
  private unreadCountLoaders: Map<string, DataLoader<string, number>> =
    new Map();

  constructor(
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly authorizationService: AuthorizationService
  ) {
    this.lastMessageLoader = this.createLastMessageLoader();
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
   * Creates a separate loader per actorID since unread counts are user-specific.
   */
  loadUnreadCount(room: IRoom, actorContext: ActorContext): Promise<number> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.READ,
      'room unreadCount'
    );
    const actorID = actorContext.actorID;
    let loader = this.unreadCountLoaders.get(actorID);
    if (!loader) {
      loader = this.createUnreadCountLoader(actorID);
      this.unreadCountLoaders.set(actorID, loader);
    }
    return loader.load(room.id);
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

  private createUnreadCountLoader(actorID: string): DataLoader<string, number> {
    return new DataLoader<string, number>(
      async (roomIds: readonly string[]) => {
        const results = await this.communicationAdapter.batchGetUnreadCounts(
          actorID,
          [...roomIds]
        );
        // Return results in the same order as input keys, defaulting to 0
        return roomIds.map(id => results[id] ?? 0);
      },
      {
        cache: true,
        name: `RoomUnreadCountLoader:${actorID}`,
      }
    );
  }
}
