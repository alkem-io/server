import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  Communication,
  ICommunication,
} from '@domain/communication/communication';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IRoom } from '../room/room.interface';
import { RoomService } from '../room/room.service';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly roomService: RoomService,
    private readonly communicationAdapter: CommunicationAdapter,
    @InjectRepository(Communication)
    private readonly communicationRepository: Repository<Communication>,
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

    try {
      communication.updates = await this.roomService.createRoom({
        displayName: `${displayName}-Updates`,
        type: RoomType.UPDATES,
      });
    } catch (error: unknown) {
      // createRoom fails when the Matrix room cannot be created; don't leave
      // the Communication saved above behind without its updates room.
      await this.removeCommunicationWithoutUpdatesRoom(communication);
      throw error;
    }

    return communication;
  }

  private async removeCommunicationWithoutUpdatesRoom(
    communication: ICommunication
  ): Promise<void> {
    const communicationId = communication.id;
    try {
      if (communication.authorization) {
        await this.authorizationPolicyService.delete(
          communication.authorization
        );
      }
      await this.communicationRepository.remove(communication as Communication);
    } catch (cleanupError: unknown) {
      this.logger.error(
        {
          message:
            'Unable to remove Communication after its updates room creation failed',
          details: { communicationId },
        },
        (cleanupError as Error)?.stack,
        LogContext.COMMUNICATION
      );
    }
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

    if (communication.authorization) {
      await this.authorizationPolicyService.delete(communication.authorization);
    }

    await this.communicationRepository.remove(communication as Communication);
    return true;
  }

  async addContributorToCommunications(
    communication: ICommunication,
    contributorActorID: string
  ): Promise<boolean> {
    if (!contributorActorID) {
      // no actor ID to manage, just return
      return true;
    }
    const roomIds = this.getRoomIds(communication);
    await this.communicationAdapter.batchAddMember(contributorActorID, roomIds);
    // Add to Matrix space hierarchy so the contributor can access callout/post rooms
    // (room-level batchAddMember only covers the updates room; space-level access
    // is needed for rooms placed inside the Matrix space via parentContextId)
    await this.communicationAdapter.batchAddSpaceMember(contributorActorID, [
      communication.spaceID,
    ]);
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

  async removeActorFromCommunications(
    communication: ICommunication,
    actorID: string
  ): Promise<boolean> {
    const roomIds = this.getRoomIds(communication);
    await this.communicationAdapter.batchRemoveMember(actorID, roomIds);
    await this.communicationAdapter.batchRemoveSpaceMember(actorID, [
      communication.spaceID,
    ]);
    return true;
  }
}
