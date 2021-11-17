import { ConfigurationTypes, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { CommunicationRoomResult } from '@domain/communication/room/communication.dto.room.result';
import { DirectRoomResult } from '@domain/community/user/dto/user.dto.communication.room.direct.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixAgentPool } from '@src/services/platform/matrix/agent-pool/matrix.agent.pool';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixGroupAdapter } from '../matrix/adapter-group/matrix.group.adapter';
import { MatrixRoomAdapter } from '../matrix/adapter-room/matrix.room.adapter';
import { MatrixUserAdapter } from '../matrix/adapter-user/matrix.user.adapter';
import { IOperationalMatrixUser } from '../matrix/adapter-user/matrix.user.interface';
import { MatrixAgent } from '../matrix/agent/matrix.agent';
import { MatrixAgentService } from '../matrix/agent/matrix.agent.service';
import { MatrixUserManagementService } from '../matrix/management/matrix.user.management.service';
import { CommunicationDeleteMessageInput } from './dto/communication.dto.message.delete';
import { CommunicationEditMessageInput } from './dto/communication.dto.message.edit';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { CommunicationSendMessageUserInput } from './dto/communication.dto.message.send.user';

@Injectable()
export class CommunicationAdapter {
  private adminUser!: IOperationalMatrixUser;
  private matrixElevatedAgent!: MatrixAgent; // elevated as created with an admin account
  private adminEmail!: string;
  private adminCommunicationsID!: string;
  private adminPassword!: string;
  private enabled = false;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private matrixAgentService: MatrixAgentService,
    private matrixAgentPool: MatrixAgentPool,
    private configService: ConfigService,
    private matrixUserManagementService: MatrixUserManagementService,
    private matrixUserAdapter: MatrixUserAdapter,
    private matrixRoomAdapter: MatrixRoomAdapter,
    private matrixGroupAdapter: MatrixGroupAdapter
  ) {
    this.adminEmail = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.admin?.username;
    this.adminPassword = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.admin?.password;

    this.adminCommunicationsID = this.matrixUserAdapter.convertEmailToMatrixID(
      this.adminEmail
    );

    // need both to be true
    this.enabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.enabled;
  }

  async sendMessage(
    sendMessageData: CommunicationSendMessageInput
  ): Promise<string> {
    // Todo: replace with proper data validation
    const message = sendMessageData.message;
    if (message.length === 0) {
      throw new ValidationException(
        'Message length cannot be empty',
        LogContext.COMMUNICATION
      );
    }
    const matrixAgent = await this.acquireMatrixAgent(
      sendMessageData.senderCommunicationsID
    );
    this.logger.verbose?.(
      `Sending message to room: ${sendMessageData.roomID}`,
      LogContext.COMMUNICATION
    );
    const messageId = await this.matrixAgentService.sendMessage(
      matrixAgent,
      sendMessageData.roomID,
      {
        text: sendMessageData.message,
      }
    );

    return messageId;
  }

  async editMessage(
    editMessageData: CommunicationEditMessageInput
  ): Promise<void> {
    const matrixAgent = await this.acquireMatrixAgent(
      editMessageData.senderCommunicationsID
    );

    await this.matrixAgentService.editMessage(
      matrixAgent,
      editMessageData.roomID,
      editMessageData.messageId,
      {
        text: editMessageData.message,
      }
    );
  }

  async deleteMessage(deleteMessageData: CommunicationDeleteMessageInput) {
    // when deleting a message use the global admin account
    // the possibility to use native matrix power levels is there
    // but we still don't have the infrastructure to support it
    const matrixAgent = await this.getMatrixManagementAgentElevated();

    await this.matrixAgentService.deleteMessage(
      matrixAgent,
      deleteMessageData.roomID,
      deleteMessageData.messageId
    );
  }

  async sendMessageToUser(
    sendMessageUserData: CommunicationSendMessageUserInput
  ): Promise<string> {
    const matrixAgent = await this.acquireMatrixAgent(
      sendMessageUserData.senderCommunicationsID
    );

    // todo: not always reinitiate the room connection
    const roomID = await this.matrixAgentService.initiateMessagingToUser(
      matrixAgent,
      {
        text: '',
        matrixID: sendMessageUserData.receiverCommunicationsID,
      }
    );

    const messageId = await this.matrixAgentService.sendMessage(
      matrixAgent,
      roomID,
      {
        text: sendMessageUserData.message,
      }
    );

    return messageId;
  }

  async getMessageSender(
    roomID: string,
    messageID: string,
    communicationUserID: string
  ): Promise<string> {
    const matrixAgent = await this.acquireMatrixAgent(communicationUserID);
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgent,
      roomID
    );

    const messages =
      await this.matrixRoomAdapter.getMatrixRoomTimelineAsMessages(
        matrixAgent.matrixClient,
        matrixRoom,
        matrixAgent.matrixClient.getUserId()
      );
    const matchingMessage = messages.find(message => message.id === messageID);
    if (!matchingMessage) return '';

    return matchingMessage.sender;
  }

  private async acquireMatrixAgent(matrixUserId: string) {
    if (!this.enabled) {
      throw new NotEnabledException(
        'Communications not enabled',
        LogContext.COMMUNICATION
      );
    }
    return await this.matrixAgentPool.acquire(matrixUserId);
  }

  private async getGlobalAdminUser() {
    if (this.adminUser) {
      return this.adminUser;
    }

    const adminExists = await this.matrixUserManagementService.isRegistered(
      this.adminCommunicationsID
    );
    if (adminExists) {
      this.logger.verbose?.(
        `Admin user is registered: ${this.adminEmail}, logging in...`,
        LogContext.COMMUNICATION
      );
      const adminUser = await this.matrixUserManagementService.login(
        this.adminCommunicationsID,
        this.adminPassword
      );
      this.adminUser = adminUser;
      return adminUser;
    }

    this.adminUser = await this.registerNewAdminUser();
    return this.adminUser;
  }

  private async getMatrixManagementAgentElevated() {
    if (this.matrixElevatedAgent) {
      return this.matrixElevatedAgent;
    }

    const adminUser = await this.getGlobalAdminUser();
    this.matrixElevatedAgent = await this.matrixAgentService.createMatrixAgent(
      adminUser
    );

    await this.matrixElevatedAgent.start({
      registerTimelineMonitor: false,
      registerRoomMonitor: false,
    });

    return this.matrixElevatedAgent;
  }

  private async registerNewAdminUser(): Promise<IOperationalMatrixUser> {
    return await this.matrixUserManagementService.register(
      this.adminCommunicationsID,
      this.adminPassword,
      true
    );
  }

  async tryRegisterNewUser(email: string): Promise<string | undefined> {
    try {
      const matrixUserID = this.matrixUserAdapter.convertEmailToMatrixID(email);

      const isRegistered = await this.matrixUserManagementService.isRegistered(
        matrixUserID
      );

      if (!isRegistered) {
        await this.matrixUserManagementService.register(matrixUserID);
      }

      return matrixUserID;
    } catch (error) {
      this.logger.verbose?.(
        `Attempt to register user failed: ${error}; user registration for Communication to be re-tried later`,
        LogContext.COMMUNICATION
      );
    }
  }

  async createCommunityGroup(
    communityId: string,
    communityName: string
  ): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    if (!communityId || !communityName) {
      this.logger.error?.(
        `Attempt to register community group with empty data ${communityId}`,
        LogContext.COMMUNICATION
      );
      return '';
    }
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const group = await this.matrixGroupAdapter.createGroup(
      elevatedMatrixAgent.matrixClient,
      {
        groupId: communityId,
        profile: {
          name: communityName,
        },
      }
    );
    this.logger.verbose?.(
      `Created group using communityID '${communityId}', communityName '${communityName}': ${group}`,
      LogContext.COMMUNICATION
    );
    return group;
  }

  async createCommunityRoom(
    groupID: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }
    const elevatedMatrixAgent = await this.getMatrixManagementAgentElevated();
    const room = await this.matrixRoomAdapter.createRoom(
      elevatedMatrixAgent.matrixClient,
      {
        groupId: groupID,
        metadata,
        createOpts: {
          name,
        },
      }
    );
    this.logger.verbose?.(
      `Created community room on group '${groupID}': ${room}`,
      LogContext.COMMUNICATION
    );
    return room;
  }

  async grantUserAccesToRooms(
    groupID: string,
    roomIDs: string[],
    matrixUserID: string
  ): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    // todo: check that the user has access properly
    try {
      await this.addUserToRooms(groupID, roomIDs, matrixUserID);
    } catch (error) {
      this.logger.verbose?.(
        `Unable to add user (${matrixUserID}) to rooms (${roomIDs}): already added?: ${error}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
    return true;
  }

  async getCommunityRooms(
    matrixUserID: string
  ): Promise<CommunicationRoomResult[]> {
    const rooms: CommunicationRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    // use the global admin account when reading the contents of rooms
    // as protected via the graphql api
    // the possibility to use native matrix power levels is there
    // but we still don't have the infrastructure to support it
    const matrixAgent = await this.getMatrixManagementAgentElevated();

    const matrixCommunityRooms =
      await this.matrixAgentService.getCommunityRooms(matrixAgent);
    for (const matrixRoom of matrixCommunityRooms) {
      const room =
        await this.matrixRoomAdapter.convertMatrixRoomToCommunityRoom(
          matrixAgent.matrixClient,
          matrixRoom,
          matrixUserID
        );
      rooms.push(room);
    }
    return rooms;
  }

  async getDirectRooms(matrixUserID: string): Promise<DirectRoomResult[]> {
    const rooms: DirectRoomResult[] = [];
    // If not enabled just return an empty array
    if (!this.enabled) {
      return rooms;
    }
    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);

    const matrixDirectRooms = await this.matrixAgentService.getDirectRooms(
      matrixAgent
    );
    for (const matrixRoom of matrixDirectRooms) {
      // todo: likely a bug in the email mapping below
      const room = await this.matrixRoomAdapter.convertMatrixRoomToDirectRoom(
        matrixAgent.matrixClient,
        matrixRoom,
        matrixRoom.receiverCommunicationsID || '',
        matrixAgent.matrixClient.getUserId()
      );
      rooms.push(room);
    }

    return rooms;
  }

  async getCommunityRoom(
    roomId: string,
    matrixUserID: string
  ): Promise<CommunicationRoomResult> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
      };
    }
    const matrixAgentElevated = await this.getMatrixManagementAgentElevated();
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgentElevated,
      roomId
    );
    return await this.matrixRoomAdapter.convertMatrixRoomToCommunityRoom(
      matrixAgentElevated.matrixClient,
      matrixRoom,
      matrixUserID // todo: what is this for?
    );
  }

  async removeUserFromRooms(
    roomIDs: string[],
    matrixUserID: string
  ): Promise<boolean> {
    // If not enabled just return
    if (!this.enabled) {
      return false;
    }
    this.logger.verbose?.(
      `Removing user (${matrixUserID}) from rooms (${roomIDs})`,
      LogContext.COMMUNICATION
    );
    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);
    for (const roomID of roomIDs) {
      await this.matrixRoomAdapter.removeUserFromRoom(
        roomID,
        matrixAgent.matrixClient
      );
    }
    return true;
  }

  async replicateRoomMembership(
    targetRoomID: string,
    sourceRoomID: string
  ): Promise<boolean> {
    try {
      const elevatedAgent = await this.getMatrixManagementAgentElevated();

      const sourceMatrixUserIDs =
        await this.matrixRoomAdapter.getMatrixRoomMembers(
          elevatedAgent.matrixClient,
          sourceRoomID
        );
      const matrixAgents: MatrixAgent[] = [];
      for (const matrixUserID of sourceMatrixUserIDs) {
        // skip the matrix elevated agent
        if (matrixUserID === elevatedAgent.matrixClient.getUserId()) continue;
        const userAgent = await this.acquireMatrixAgent(matrixUserID);
        matrixAgents.push(userAgent);
      }

      const oneTimeMembershipPromises = matrixAgents.map(
        a =>
          new Promise<void>((resolve, reject) => {
            a.attachOnceConditional({
              id: targetRoomID,
              roomMemberMembershipMonitor:
                a.resolveSpecificRoomMembershipOneTimeMonitor(
                  // subscribe for events for a specific room
                  targetRoomID,
                  a.matrixClient.getUserId(),
                  // once we have joined the room detach the subscription
                  () => a.detach(targetRoomID),
                  resolve,
                  reject
                ),
            });
          })
      );

      await this.matrixRoomAdapter.inviteUsersToRoom(
        elevatedAgent.matrixClient,
        targetRoomID,
        matrixAgents.map(a => a.matrixClient)
      );

      await Promise.all(oneTimeMembershipPromises);
    } catch (error) {
      this.logger.error?.(
        `Unable to duplicate room membership from (${sourceRoomID}) to (${targetRoomID}): ${error}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
    return true;
  }

  private async addUserToRooms(
    groupID: string,
    roomIDs: string[],
    matrixUserID: string
  ) {
    // If not enabled just return an empty string
    if (!this.enabled) {
      return '';
    }

    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    const userAgent = await this.matrixAgentPool.acquire(matrixUserID);
    // first send invites to the rooms - the group invite fails once accepted
    // for multiple rooms in a group this will cause failure before inviting the user over
    // TODO: Need to add a check whether the user is already part of the room/group
    for (const roomID of roomIDs) {
      await this.matrixRoomAdapter.inviteUsersToRoom(
        elevatedAgent.matrixClient,
        roomID,
        [userAgent.matrixClient]
      );
    }
    await this.matrixGroupAdapter.inviteUsersToGroup(
      elevatedAgent.matrixClient,
      groupID,
      [userAgent.matrixClient]
    );
  }

  async removeRoom(matrixRoomID: string) {
    try {
      //const elevatedAgent = await this.getMatrixManagementAgentElevated();
      //todo: remove the room
      this.logger.verbose?.(
        `Removing matrix room: ${matrixRoomID}`,
        LogContext.COMMUNICATION
      );
    } catch (error) {
      this.logger.verbose?.(
        `Unable to remove room  (${matrixRoomID}): ${error}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
    return true;
  }

  async getRoomMembers(matrixRoomID: string): Promise<string[]> {
    let userIDs: string[] = [];
    try {
      const elevatedAgent = await this.getMatrixManagementAgentElevated();
      this.logger.verbose?.(
        `Getting members of matrix room: ${matrixRoomID}`,
        LogContext.COMMUNICATION
      );
      userIDs = await this.matrixRoomAdapter.getMatrixRoomMembers(
        elevatedAgent.matrixClient,
        matrixRoomID
      );
    } catch (error) {
      this.logger.verbose?.(
        `Unable to get room members (${matrixRoomID}): ${error}`,
        LogContext.COMMUNICATION
      );
      throw error;
    }
    return userIDs;
  }
}
