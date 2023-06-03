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
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionService } from '../discussion/discussion.service';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IUser } from '@domain/community/user/user.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';
import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { CommunicationDiscussionCategoryException } from '@common/exceptions/communication.discussion.category.exception';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoomService } from '../room/room.service';
import { IRoom } from '../room/room.interface';
import { RoomType } from '@common/enums/room.type';
import { COMMUNICATION_PLATFORM_HUBID } from '@common/constants';

@Injectable()
export class CommunicationService {
  constructor(
    private discussionService: DiscussionService,
    private roomService: RoomService,
    private communicationAdapter: CommunicationAdapter,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunication(
    displayName: string,
    hubID: string,
    discussionCategories: DiscussionCategory[]
  ): Promise<ICommunication> {
    const communication: ICommunication = new Communication(displayName);
    communication.authorization = new AuthorizationPolicy();
    communication.hubID = hubID;

    communication.discussions = [];
    communication.discussionCategories = discussionCategories;

    // save to get the id assigned
    await this.save(communication);

    communication.updates = await this.roomService.createRoom(
      `${displayName}-Updates`,
      RoomType.UPDATES
    );

    return await this.communicationRepository.save(communication);
  }

  async save(communication: ICommunication): Promise<ICommunication> {
    return await this.communicationRepository.save(communication);
  }

  async createDiscussion(
    discussionData: CommunicationCreateDiscussionInput,
    userID: string,
    userCommunicationID: string
  ): Promise<IDiscussion> {
    const displayName = discussionData.profile.displayName;
    const communicationID = discussionData.communicationID;

    this.logger.verbose?.(
      `[Discussion] Adding discussion (${displayName}) to Communication (${communicationID})`,
      LogContext.COMMUNICATION
    );

    // Try to find the Communication
    const communication = await this.getCommunicationOrFail(communicationID, {
      relations: ['discussions'],
    });

    if (!communication.discussionCategories.includes(discussionData.category)) {
      throw new CommunicationDiscussionCategoryException(
        `Invalid discussion category supplied ('${discussionData.category}'), allowed categories: ${communication.discussionCategories}`,
        LogContext.COMMUNICATION
      );
    }

    let roomType = RoomType.DISCUSSION;
    if (this.isPlatformCommunication(communication)) {
      roomType = RoomType.DISCUSSION_FORUM;
    }
    const discussion = await this.discussionService.createDiscussion(
      discussionData,
      userID,
      communication.displayName,
      roomType
    );
    this.logger.verbose?.(
      `[Discussion] Room created (${displayName}) and membership replicated from Updates (${communicationID})`,
      LogContext.COMMUNICATION
    );

    communication.discussions?.push(discussion);
    await this.communicationRepository.save(communication);

    // Trigger a room membership request for the current user that is not awaited
    const room = await this.discussionService.getComments(discussion.id);
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      userCommunicationID
    );

    // we're no longer replicating membership, because all the rooms are public and visible.
    // Set the Matrix membership so that users sending to rooms they are a member of responds quickly
    // const updates = this.getUpdates(communication);
    // Do not await as the memberhip will be updated in the background
    // this.communicationAdapter.replicateRoomMembership(
    //   discussion.communicationRoomID,
    //   updates.communicationRoomID,
    //   userCommunicationID
    // );

    return discussion;
  }

  private isPlatformCommunication(communication: ICommunication): boolean {
    if (communication.hubID === COMMUNICATION_PLATFORM_HUBID) {
      return true;
    }
    return false;
  }

  async getDiscussions(communication: ICommunication): Promise<IDiscussion[]> {
    const communicationWithDiscussions = await this.getCommunicationOrFail(
      communication.id,
      {
        relations: ['discussions'],
      }
    );
    const discussions = communicationWithDiscussions.discussions;
    if (!discussions)
      throw new EntityNotInitializedException(
        `Unable to load Discussions for Communication: ${communication.displayName} `,
        LogContext.COMMUNICATION
      );

    return discussions;
  }

  async getDiscussionOrFail(
    communication: ICommunication,
    discussionID: string
  ): Promise<IDiscussion> {
    const discussions = await this.getDiscussions(communication);
    let discussion: IDiscussion | undefined;
    if (discussionID.length === UUID_LENGTH) {
      discussion = discussions.find(
        discussion => discussion.id === discussionID
      );
    }
    if (!discussion) {
      // look up based on nameID
      discussion = discussions.find(
        discussion => discussion.nameID === discussionID
      );
    }

    if (!discussion) {
      throw new EntityNotFoundException(
        `Unable to find Discussion with ID: ${discussionID}`,
        LogContext.COMMUNICATION
      );
    }
    return discussion;
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
      relations: ['discussions'],
    });

    // Remove all groups
    for (const discussion of await this.getDiscussions(communication)) {
      await this.discussionService.removeDiscussion({
        ID: discussion.id,
      });
    }

    await this.roomService.deleteRoom(this.getUpdates(communication));

    await this.communicationRepository.remove(communication as Communication);
    return true;
  }

  async addUserToCommunications(
    communication: ICommunication,
    communicationUserID: string
  ): Promise<boolean> {
    const communicationRoomIDs = await this.getRoomsUsed(communication);
    await this.communicationAdapter.grantUserAccesToRooms(
      communicationRoomIDs,
      communicationUserID
    );

    return true;
  }

  async getRoomsUsed(communication: ICommunication): Promise<string[]> {
    const communicationRoomIDs: string[] = [
      this.getUpdates(communication).externalRoomID,
    ];
    const discussions = await this.getDiscussions(communication);
    for (const discussion of discussions) {
      const room = await this.discussionService.getComments(discussion.id);
      communicationRoomIDs.push(room.displayName);
    }
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
    for (const discussion of await this.getDiscussions(communication)) {
      const room = await this.discussionService.getComments(discussion.id);
      communicationRoomIDs.push(room.externalRoomID);
    }
    await this.communicationAdapter.removeUserFromRooms(
      communicationRoomIDs,
      user.communicationID
    );

    return true;
  }
}
