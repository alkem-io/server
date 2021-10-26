import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Communication,
  ICommunication,
} from '@domain/communication/communication';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { ConfigService } from '@nestjs/config';
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionService } from '../discussion/discussion.service';
import { CommunicationRemoveUpdateMessageInput } from './dto/communication.dto.remove.update.message';
import { CommunicationAdapterService } from '@services/platform/communication-adapter/communication.adapter.service';
import { IUser } from '@domain/community/user/user.interface';
import { CommunicationSendUpdateMessageInput } from './dto/communication.dto.send.update.message';
import { CommunicationRoomResult } from '../room/communication.dto.room.result';
import { RoomService } from '../room/room.service';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';

@Injectable()
export class CommunicationService {
  private communicationsEnabled = false;

  constructor(
    private configService: ConfigService,
    private discussionService: DiscussionService,
    private communicationAdapterService: CommunicationAdapterService,
    private roomService: RoomService,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    // need both to be true
    this.communicationsEnabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.enabled;
  }

  async createCommunication(): Promise<ICommunication> {
    const communication = new Communication();
    communication.authorization = new AuthorizationPolicy();

    communication.discussions = [];
    // save to get an id assigned
    await this.communicationRepository.save(communication);
    return await this.initializeCommunicationsRoom(communication);
  }

  async createDiscussion(
    discussionData: CommunicationCreateDiscussionInput
  ): Promise<IDiscussion> {
    const title = discussionData.title;
    const communicationID = discussionData.communicationID;

    this.logger.verbose?.(
      `Adding discussion (${title}) to Communication (${communicationID})`,
      LogContext.COMMUNICATION
    );

    // Try to find the Communication
    const communication = await this.getCommunicationOrFail(communicationID);

    const discussion = await this.discussionService.createDiscussion(
      discussionData
    );
    communication.discussions?.push(discussion);
    await this.communicationRepository.save(communication);

    return discussion;
  }

  // Loads the discussions into the Communication entity if not already present
  getDiscussions(communication: ICommunication): IDiscussion[] {
    if (!communication.discussions) {
      throw new EntityNotInitializedException(
        `Communication not initialized: ${communication.id}`,
        LogContext.COMMUNICATION
      );
    }
    return communication.discussions;
  }

  async getCommunicationOrFail(
    communicationID: string,
    options?: FindOneOptions<Communication>
  ): Promise<ICommunication> {
    const communication = await this.communicationRepository.findOne(
      { id: communicationID },
      options
    );
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
      relations: ['discussions'],
    });

    // Remove all groups
    if (communication.discussions) {
      for (const discussion of communication.discussions) {
        await this.discussionService.removeDiscussion({
          ID: discussion.id,
        });
      }
    }

    await this.communicationRepository.remove(communication as Communication);
    return true;
  }

  async initializeCommunicationsRoom(
    communication: ICommunication
  ): Promise<ICommunication> {
    try {
      communication.communicationGroupID =
        await this.communicationAdapterService.createCommunityGroup(
          communication.id,
          communication.displayName
        );
      communication.updatesRoomID =
        await this.communicationAdapterService.createCommunityRoom(
          communication.communicationGroupID,
          `${communication.displayName} updates`,
          { communicationId: communication.id }
        );
      return await this.communicationRepository.save(communication);
    } catch (error) {
      this.logger.error?.(
        `Unable to initialize communications for communication (${communication.displayName}): ${error}`,
        LogContext.COMMUNICATION
      );
    }
    return communication;
  }

  async getUpdatesCommunicationsRoom(
    communication: ICommunication,
    communicationID: string
  ): Promise<CommunicationRoomResult> {
    if (
      this.communicationsEnabled &&
      communication.communicationGroupID === ''
    ) {
      await this.initializeCommunicationsRoom(communication);
    }

    await this.communicationAdapterService.ensureUserHasAccesToCommunityMessaging(
      communication.communicationGroupID,
      [communication.updatesRoomID],
      communicationID
    );

    const room = await this.communicationAdapterService.getCommunityRoom(
      communication.updatesRoomID,
      communicationID
    );

    await this.roomService.populateRoomMessageSenders([room]);

    return room;
  }

  async sendMessageToCommunicationUpdates(
    communication: ICommunication,
    communicationID: string,
    messageData: CommunicationSendUpdateMessageInput
  ): Promise<string> {
    await this.communicationAdapterService.ensureUserHasAccesToCommunityMessaging(
      communication.communicationGroupID,
      [communication.updatesRoomID],
      communicationID
    );
    return await this.communicationAdapterService.sendMessageToCommunityRoom({
      senderCommunicationsID: communicationID,
      message: messageData.message,
      roomID: communication.updatesRoomID,
    });
  }

  async removeMessageFromCommunicationUpdates(
    communication: ICommunication,
    communicationID: string,
    messageData: CommunicationRemoveUpdateMessageInput
  ) {
    await this.communicationAdapterService.ensureUserHasAccesToCommunityMessaging(
      communication.communicationGroupID,
      [communication.updatesRoomID],
      communicationID
    );
    await this.communicationAdapterService.deleteMessageFromCommunityRoom({
      senderCommunicationsID: communicationID,
      messageId: messageData.messageId,
      roomID: communication.updatesRoomID,
    });
  }

  async addUserToCommunications(
    communication: ICommunication,
    user: IUser
  ): Promise<boolean> {
    await this.communicationAdapterService.addUserToCommunityMessaging(
      communication.communicationGroupID,
      [communication.updatesRoomID],
      user.communicationID
    );

    // todo: also add the user to all the discussion rooms
    return true;
  }
}
