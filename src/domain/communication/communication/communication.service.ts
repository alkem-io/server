import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Communication,
  ICommunication,
} from '@domain/communication/communication';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomService } from '../room/room.service';
import { IRoom } from '../room/room.interface';
import { RoomType } from '@common/enums/room.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly roomService: RoomService,
    private readonly communicationAdapter: CommunicationAdapter,
    @InjectRepository(Communication)
    private readonly communicationRepository: Repository<Communication>
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
    return this.communicationRepository.save(communication);
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
    options?: FindOneOptions<Communication>
  ): Promise<ICommunication | never> {
    const communication = await this.communicationRepository.findOne({
      where: {
        id: communicationID,
      },
      ...options,
    });
    if (!communication)
      throw new EntityNotFoundException(
        `Unable to find Communication with ID: ${communicationID}`,
        LogContext.COMMUNICATION
      );
    return communication;
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

    await this.communicationRepository.remove(communication as Communication);
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
    const results = await this.communicationRepository
      .createQueryBuilder('communication')
      .select('communication.id', 'id')
      .getRawMany<{ id: string }>();
    return results.map(r => r.id);
  }

  async removeUserFromCommunications(
    communication: ICommunication,
    userId: string
  ): Promise<boolean> {
    const roomIds = this.getRoomIds(communication);
    await this.communicationAdapter.batchRemoveMember(userId, roomIds);
    return true;
  }

  async removeContributorFromCommunications(
    communication: ICommunication,
    actorId: string
  ): Promise<boolean> {
    const roomIds = this.getRoomIds(communication);
    await this.communicationAdapter.batchRemoveMember(actorId, roomIds);
    return true;
  }
}
