import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Communication,
  ICommunication,
} from '@domain/communication/communication';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IUser } from '@domain/community/user/user.interface';
import { RoomService } from '../room/room.service';
import { IRoom } from '../room/room.interface';
import { RoomType } from '@common/enums/room.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class CommunicationService {
  constructor(
    private roomService: RoomService,
    private communicationAdapter: CommunicationAdapter,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
      senderID: undefined, // No sender for communication rooms
      type: RoomType.UPDATES,
    });

    return communication;
  }

  async save(communication: ICommunication): Promise<ICommunication> {
    return await this.communicationRepository.save(communication);
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
    contributorCommunicationID: string
  ): Promise<boolean> {
    if (!contributorCommunicationID || contributorCommunicationID === '') {
      // no communication ID to manage, just return
      return true;
    }
    const communicationRoomIDs = await this.getRoomsUsed(communication);
    await this.communicationAdapter.userAddToRooms(
      communicationRoomIDs,
      contributorCommunicationID
    );

    return true;
  }

  async getRoomsUsed(communication: ICommunication): Promise<string[]> {
    const communicationRoomIDs: string[] = [
      this.getUpdates(communication).externalRoomID,
    ];

    return communicationRoomIDs;
  }

  async getCommunicationIDsUsed(): Promise<string[]> {
    const communicationMatches = await this.communicationRepository
      .createQueryBuilder('communication')
      .getMany();
    const communicationIDs: string[] = [];
    for (const communication of communicationMatches) {
      communicationIDs.push(communication.id);
    }
    return communicationIDs;
  }

  async removeUserFromCommunications(
    communication: ICommunication,
    user: IUser
  ): Promise<boolean> {
    // get the list of rooms to add the user to
    const communicationRoomIDs: string[] = [
      this.getUpdates(communication).externalRoomID,
    ];

    await this.communicationAdapter.removeUserFromRooms(
      communicationRoomIDs,
      user.communicationID
    );

    return true;
  }
}
