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
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IUser } from '@domain/community/user/user.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';
import { UpdatesService } from '../updates/updates.service';
import { IUpdates } from '../updates/updates.interface';
import { RoomService } from '../room/room.service';
import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { CommunicationDiscussionCategoryException } from '@common/exceptions/communication.discussion.category.exception';

@Injectable()
export class CommunicationService {
  private communicationsEnabled = false;

  constructor(
    private configService: ConfigService,
    private discussionService: DiscussionService,
    private updatesService: UpdatesService,
    private communicationAdapter: CommunicationAdapter,
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
    const communicationGroupID = await this.initializeCommunicationsGroup(
      communication
    );
    if (communicationGroupID) {
      communication.communicationGroupID = communicationGroupID;
    }

    communication.updates = await this.updatesService.createUpdates(
      communication.communicationGroupID,
      `${displayName}-Updates`
    );

    return await this.communicationRepository.save(communication);
  }

  async ensureCommunicationRoomsCreated(): Promise<void> {
    // find any communications without a group
    // Then load data to do the sorting
    const communicationsWithoutGroups = await this.communicationRepository
      .createQueryBuilder('communication')
      .where('communicationGroupID = :id')
      .setParameters({ id: '' })
      .getMany();

    communicationsWithoutGroups.forEach(async communicationWithoutGroup => {
      // Load through normal mechanism to pick up eager loading, discussions
      const communication = await this.getCommunicationOrFail(
        communicationWithoutGroup.id,
        {
          relations: ['discussions', 'updates'],
        }
      );
      this.logger.warn?.(
        `Identified communication (${communication.id}) without communicationGroup set`,
        LogContext.COMMUNICATION
      );
      const communicationGroupID = await this.initializeCommunicationsGroup(
        communication
      );
      if (communicationGroupID) {
        communication.communicationGroupID = communicationGroupID;
      }

      const updates = await this.getUpdates(communication);
      updates.communicationGroupID = communication.communicationGroupID;
      await this.roomService.initializeCommunicationRoom(updates);

      const discussions = await this.getDiscussions(communication);
      for (const discussion of discussions) {
        discussion.communicationGroupID = communication.communicationGroupID;
        await this.roomService.initializeCommunicationRoom(discussion);
      }
      await this.save(communication);
    });
  }

  async initializeCommunicationsGroup(
    communication: ICommunication
  ): Promise<string | undefined> {
    if (!this.communicationsEnabled) {
      // not enabled, just return
      return undefined;
    }
    if (communication.communicationGroupID === '') {
      try {
        const communicationGroupID =
          await this.communicationAdapter.createCommunityGroup(
            communication.id,
            communication.displayName
          );
        return communicationGroupID;
      } catch (error: any) {
        if (error?.message?.includes('Group already exists')) {
          const existingGroupID =
            await this.communicationAdapter.convertMatrixLocalGroupIdToMatrixID(
              communication.id
            );
          this.logger.warn?.(
            `Group for Communication (${communication.displayName}) already exists: ${error} - returning existing ID: ${existingGroupID}`,
            LogContext.COMMUNICATION
          );
          return existingGroupID;
        }
        this.logger.error?.(
          `Unable to initialize group for Communication (${communication.displayName}): ${error}`,
          LogContext.COMMUNICATION
        );
      }
    }
    return undefined;
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

    const discussion = await this.discussionService.createDiscussion(
      discussionData,
      communication.communicationGroupID,
      userID,
      communication.displayName
    );
    this.logger.verbose?.(
      `[Discussion] Room created (${displayName}) and membership replicated from Updates (${communicationID})`,
      LogContext.COMMUNICATION
    );

    communication.discussions?.push(discussion);
    await this.communicationRepository.save(communication);

    // Trigger a room membership request for the current user that is not awaited
    await this.communicationAdapter.addUserToRoom(
      discussion.communicationRoomID,
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
    const discussion = discussions.find(
      discussion => discussion.id === discussionID
    );
    if (!discussion) {
      throw new EntityNotFoundException(
        `Unable to find Discussion with ID: ${discussionID}`,
        LogContext.COMMUNICATION
      );
    }
    return discussion;
  }

  getUpdates(communication: ICommunication): IUpdates {
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

    await this.updatesService.deleteUpdates(this.getUpdates(communication));

    await this.communicationRepository.remove(communication as Communication);
    return true;
  }

  async addUserToCommunications(
    communication: ICommunication,
    communicationUserID: string
  ): Promise<boolean> {
    const communicationRoomIDs = await this.getRoomsUsed(communication);
    await this.communicationAdapter.grantUserAccesToRooms(
      communication.communicationGroupID,
      communicationRoomIDs,
      communicationUserID
    );

    return true;
  }

  async getRoomsUsed(communication: ICommunication): Promise<string[]> {
    const communicationRoomIDs: string[] = [
      this.getUpdates(communication).communicationRoomID,
    ];
    const discussions = await this.getDiscussions(communication);
    for (const discussion of discussions) {
      communicationRoomIDs.push(discussion.communicationRoomID);
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
      this.getUpdates(communication).communicationRoomID,
    ];
    for (const discussion of await this.getDiscussions(communication)) {
      communicationRoomIDs.push(discussion.communicationRoomID);
    }
    await this.communicationAdapter.removeUserFromRooms(
      communicationRoomIDs,
      user.communicationID
    );

    return true;
  }
}
