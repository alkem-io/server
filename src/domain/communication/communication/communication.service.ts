import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  Communication,
  ICommunication,
} from '@domain/communication/communication';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { communications } from './communication.schema';
import { IRoom } from '../room/room.interface';
import { RoomService } from '../room/room.service';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly roomService: RoomService,
    private readonly communicationAdapter: CommunicationAdapter,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  async createCommunication(
    displayName: string,
    spaceID: string
  ): Promise<ICommunication> {
    const communication: ICommunication = new Communication(displayName);
    communication.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION
    );
    communication.spaceID = spaceID;

    // save to get the id assigned
    await this.save(communication);

    communication.updates = await this.roomService.createRoom({
      displayName: `${displayName}-Updates`,
      type: RoomType.UPDATES,
    });

    return communication;
  }

  async save(communication: ICommunication): Promise<ICommunication> {
    if (communication.id) {
      const [result] = await this.db
        .update(communications)
        .set({
          displayName: communication.displayName,
          spaceID: communication.spaceID,
          updatesId: communication.updates?.id,
        })
        .where(eq(communications.id, communication.id))
        .returning();
      return result as unknown as ICommunication;
    } else {
      const [result] = await this.db
        .insert(communications)
        .values({
          displayName: communication.displayName,
          spaceID: communication.spaceID,
          updatesId: communication.updates?.id,
        })
        .returning();
      return result as unknown as ICommunication;
    }
  }

  getUpdates(communication: ICommunication): IRoom {
    if (!communication.updates) {
      throw new EntityNotInitializedException(
        `Communication not initialized, no Updates: ${communication.id}`,
        LogContext.COMMUNICATION
      );
    }
    return communication.updates;
  }

  async getCommunicationOrFail(
    communicationID: string,
    options?: { relations?: { updates?: boolean | { authorization?: boolean } } }
  ): Promise<ICommunication | never> {
    let updatesWith: any = undefined;
    if (options?.relations?.updates) {
      if (typeof options.relations.updates === 'object') {
        const nested: any = {};
        if (options.relations.updates.authorization) nested.authorization = true;
        updatesWith = { updates: { with: nested } };
      } else {
        updatesWith = { updates: true };
      }
    }
    const communication = await this.db.query.communications.findFirst({
      where: eq(communications.id, communicationID),
      with: updatesWith,
    });
    if (!communication)
      throw new EntityNotFoundException(
        `Unable to find Communication with ID: ${communicationID}`,
        LogContext.COMMUNICATION
      );
    return communication as unknown as ICommunication;
  }

  async removeCommunication(communicationID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const communication = await this.getCommunicationOrFail(communicationID, {
      relations: { updates: true },
    });

    if (!communication.updates)
      throw new EntityNotFoundException(
        `Unable to find Communication with ID: ${communicationID}`,
        LogContext.COMMUNICATION
      );

    await this.roomService.deleteRoom({
      roomID: communication.updates.id,
    });

    await this.db
      .delete(communications)
      .where(eq(communications.id, communicationID));
    return true;
  }

  async addContributorToCommunications(
    communication: ICommunication,
    contributorActorId: string
  ): Promise<boolean> {
    if (!contributorActorId) {
      // no actor ID to manage, just return
      return true;
    }
    const roomIds = this.getRoomIds(communication);
    await this.communicationAdapter.batchAddMember(contributorActorId, roomIds);
    return true;
  }

  /**
   * Get all room IDs used by this communication.
   * Currently only the updates room, but extensible for future room types.
   */
  getRoomIds(communication: ICommunication): string[] {
    return [this.getUpdates(communication).id];
  }

  async getCommunicationIDsUsed(): Promise<string[]> {
    const results = await this.db.query.communications.findMany({
      columns: { id: true },
    });
    return results.map(r => r.id);
  }

  async removeUserFromCommunications(
    communication: ICommunication,
    user: IUser
  ): Promise<boolean> {
    if (!user.agent?.id) {
      // no agent ID to manage, just return
      return true;
    }
    const roomIds = this.getRoomIds(communication);
    await this.communicationAdapter.batchRemoveMember(user.agent.id, roomIds);
    return true;
  }
}
