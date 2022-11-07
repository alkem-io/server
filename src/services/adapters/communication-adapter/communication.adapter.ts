import { ConfigurationTypes, LogContext } from '@common/enums';
import { MatrixEntityNotFoundException } from '@common/exceptions';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { DirectRoomResult } from '@domain/community/user/dto/user.dto.communication.room.direct.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixAgentPool } from '@services/external/matrix/agent-pool/matrix.agent.pool';
import { MatrixClient } from 'matrix-js-sdk';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixGroupAdapter } from '@services/external/matrix/adapter-group/matrix.group.adapter';
import { MatrixRoomAdapter } from '@services/external/matrix/adapter-room/matrix.room.adapter';
import { MatrixUserAdapter } from '@services/external/matrix/adapter-user/matrix.user.adapter';
import { IOperationalMatrixUser } from '@services/external/matrix/adapter-user/matrix.user.interface';
import { MatrixAgent } from '@services/external/matrix/agent/matrix.agent';
import { MatrixAgentService } from '@services/external/matrix/agent/matrix.agent.service';
import { MatrixUserManagementService } from '@services/external/matrix/management/matrix.user.management.service';
import { CommunicationDeleteMessageInput } from './dto/communication.dto.message.delete';
import { CommunicationEditMessageInput } from './dto/communication.dto.message.edit';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import { CommunicationSendMessageUserInput } from './dto/communication.dto.message.send.user';
import { IMessage } from '@domain/communication/message/message.interface';

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
  ): Promise<IMessage> {
    // Todo: replace with proper data validation
    const message = sendMessageData.message;

    const senderCommunicationID = sendMessageData.senderCommunicationsID;
    const matrixAgent = await this.acquireMatrixAgent(senderCommunicationID);

    await this.matrixUserAdapter.verifyRoomMembershipOrFail(
      matrixAgent.matrixClient,
      sendMessageData.roomID
    );
    this.logger.verbose?.(
      `[Message sending] Sending message to room: ${sendMessageData.roomID}`,
      LogContext.COMMUNICATION
    );
    let messageId = '';
    try {
      messageId = await this.matrixAgentService.sendMessage(
        matrixAgent,
        sendMessageData.roomID,
        {
          text: sendMessageData.message,
        }
      );
    } catch (error: any) {
      this.logger.error(
        `[Message sending] Unable to send message for user (${senderCommunicationID}): ${error}`,
        LogContext.COMMUNICATION
      );
      throw error;
    }
    this.logger.verbose?.(
      `...message sent to room: ${sendMessageData.roomID}`,
      LogContext.COMMUNICATION
    );

    // Create the 'equivalent' message. Note that this can have a very minor timestamp offset
    // from the actual message.
    const timestamp = new Date().getTime();
    return {
      id: messageId,
      message: message,
      sender: sendMessageData.senderCommunicationsID,
      timestamp: timestamp,
    };
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

  async deleteMessage(
    deleteMessageData: CommunicationDeleteMessageInput
  ): Promise<string> {
    // when deleting a message use the global admin account
    // the possibility to use native matrix power levels is there
    // but we still don't have the infrastructure to support it
    const matrixAgent = await this.getMatrixManagementAgentElevated();

    await this.matrixAgentService.deleteMessage(
      matrixAgent,
      deleteMessageData.roomID,
      deleteMessageData.messageId
    );
    return deleteMessageData.messageId;
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

  async getMessageSender(roomID: string, messageID: string): Promise<string> {
    // only the admin agent has knowledge of all rooms and synchronizes the state
    const matrixElevatedAgent = await this.getMatrixManagementAgentElevated();
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixElevatedAgent,
      roomID
    );

    const messages =
      await this.matrixRoomAdapter.getMatrixRoomTimelineAsMessages(
        matrixElevatedAgent.matrixClient,
        matrixRoom
      );
    const matchingMessage = messages.find(message => message.id === messageID);
    if (!matchingMessage) {
      throw new MatrixEntityNotFoundException(
        `Unable to locate message (id: ${messageID}) in room: ${matrixRoom.name} (${roomID})`,
        LogContext.COMMUNICATION
      );
    }

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

  async convertMatrixLocalGroupIdToMatrixID(groupID: string): Promise<string> {
    return this.matrixGroupAdapter.convertMatrixLocalGroupIdToMatrixID(groupID);
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
    try {
      await this.addUserToGroup(groupID, matrixUserID);
      await this.addUserToRooms(roomIDs, matrixUserID);
    } catch (error) {
      this.logger.warn?.(
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
    const matrixAgentElevated = await this.getMatrixManagementAgentElevated();

    const matrixAgent = await this.matrixAgentPool.acquire(matrixUserID);

    const matrixCommunityRooms =
      await this.matrixAgentService.getCommunityRooms(matrixAgent);
    for (const matrixRoom of matrixCommunityRooms) {
      const room =
        await this.matrixRoomAdapter.convertMatrixRoomToCommunityRoom(
          matrixAgentElevated.matrixClient,
          matrixRoom
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
        matrixRoom.receiverCommunicationsID || ''
      );
      rooms.push(room);
    }

    return rooms;
  }

  async getCommunityRoom(roomId: string): Promise<CommunicationRoomResult> {
    // If not enabled just return an empty room
    if (!this.enabled) {
      return {
        id: 'communications-not-enabled',
        messages: [],
        displayName: '',
        members: [],
      };
    }
    const matrixAgentElevated = await this.getMatrixManagementAgentElevated();
    const matrixRoom = await this.matrixAgentService.getRoom(
      matrixAgentElevated,
      roomId
    );
    return await this.matrixRoomAdapter.convertMatrixRoomToCommunityRoom(
      matrixAgentElevated.matrixClient,
      matrixRoom
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
    const userAgent = await this.matrixAgentPool.acquire(matrixUserID);
    const matrixAgentElevated = await this.getMatrixManagementAgentElevated();
    for (const roomID of roomIDs) {
      // added this for logging purposes
      userAgent.attachOnceConditional({
        id: roomID,
        roomMemberMembershipMonitor:
          userAgent.resolveForgetRoomMembershipOneTimeMonitor(
            roomID,
            matrixUserID,
            // once we have forgotten the room detach the subscription
            () => userAgent.detach(roomID),
            () => this.logger.verbose?.('completed'),
            () => this.logger.verbose?.('rejected')
          ) as any,
      });
      await this.matrixRoomAdapter.removeUserFromRoom(
        matrixAgentElevated.matrixClient,
        roomID,
        userAgent.matrixClient
      );
    }
    return true;
  }

  async getAllRooms(): Promise<CommunicationRoomResult[]> {
    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    this.logger.verbose?.(
      `[Admin] Obtaining all rooms on Matrix instance using ${elevatedAgent.matrixClient.getUserId()}`,
      LogContext.COMMUNICATION
    );
    const rooms = await elevatedAgent.matrixClient.getRooms();
    const roomResults: CommunicationRoomResult[] = [];
    for (const room of rooms) {
      // Only count rooms with at least one member that is not the elevated agent
      const memberIDs = await this.matrixRoomAdapter.getMatrixRoomMembers(
        elevatedAgent.matrixClient,
        room.roomId
      );
      if (memberIDs.length === 0) continue;
      if (memberIDs.length === 1) {
        if (memberIDs[0] === elevatedAgent.matrixClient.getUserId()) continue;
      }
      const roomResult = new CommunicationRoomResult();
      roomResult.id = room.roomId;
      roomResult.displayName = room.name;
      roomResult.members = memberIDs;
      roomResults.push(roomResult);
    }

    return roomResults;
  }

  async replicateRoomMembership(
    targetRoomID: string,
    sourceRoomID: string,
    userToPrioritize: string
  ): Promise<boolean> {
    try {
      this.logger.verbose?.(
        `[Replication] Replicating room membership from ${sourceRoomID} to ${targetRoomID}`,
        LogContext.COMMUNICATION
      );
      const elevatedAgent = await this.getMatrixManagementAgentElevated();

      const sourceMatrixUserIDs =
        await this.matrixRoomAdapter.getMatrixRoomMembers(
          elevatedAgent.matrixClient,
          sourceRoomID
        );

      // Ensure the user to be prioritized is first
      const userIndex = sourceMatrixUserIDs.findIndex(
        userID => userID === userToPrioritize
      );
      if (userIndex !== -1) {
        sourceMatrixUserIDs.splice(0, 0, userToPrioritize);
        sourceMatrixUserIDs.splice(userIndex + 1, 1);
      }

      for (const matrixUserID of sourceMatrixUserIDs) {
        // skip the matrix elevated agent
        if (matrixUserID === elevatedAgent.matrixClient.getUserId()) continue;
        const userAgent = await this.acquireMatrixAgent(matrixUserID);

        userAgent.attachOnceConditional({
          id: targetRoomID,
          roomMemberMembershipMonitor:
            userAgent.resolveAutoAcceptRoomMembershipOneTimeMonitor(
              // subscribe for events for a specific room
              targetRoomID,
              userAgent.matrixClient.getUserId(),
              // once we have joined the room detach the subscription
              () => userAgent.detach(targetRoomID)
            ),
        });

        await this.matrixRoomAdapter.inviteUserToRoom(
          elevatedAgent.matrixClient,
          targetRoomID,
          userAgent.matrixClient
        );
      }
    } catch (error) {
      this.logger.error?.(
        `Unable to duplicate room membership from (${sourceRoomID}) to (${targetRoomID}): ${error}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
    return true;
  }

  private async addUserToGroup(groupID: string, matrixUserID: string) {
    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    const userAgent = await this.matrixAgentPool.acquire(matrixUserID);
    if (await this.isUserInGroup(userAgent.matrixClient, groupID)) {
      // nothing to do...
      return;
    }

    await this.matrixGroupAdapter.inviteUserToGroup(
      elevatedAgent.matrixClient,
      groupID,
      userAgent.matrixClient
    );
  }

  public async addUserToRoom(
    // groupID: string, according to matrix docs groups are getting deprecated
    roomID: string,
    matrixUserID: string
  ) {
    const userAgent = await this.matrixAgentPool.acquire(matrixUserID);

    const isUserMember = await this.matrixUserAdapter.isUserMemberOfRoom(
      userAgent.matrixClient,
      roomID
    );
    try {
      if (isUserMember === false) {
        await this.matrixRoomAdapter.joinRoomSafe(
          userAgent.matrixClient,
          roomID
        );
      }
    } catch (ex: any) {
      this.logger.error?.(
        `[Membership] Exception user joining a room (user: ${matrixUserID}) room: ${roomID}) - ${ex.toString()}`,
        LogContext.COMMUNICATION
      );
    }
  }

  private async addUserToRooms(roomIDs: string[], matrixUserID: string) {
    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    const userAgent = await this.matrixAgentPool.acquire(matrixUserID);

    const roomsToAdd = await this.getRoomsUserIsNotMember(
      userAgent.matrixClient,
      roomIDs
    );

    if (roomsToAdd.length === 0) {
      // Nothing to do; avoid wait below...
      return;
    }

    for (const roomID of roomsToAdd) {
      this.logger.verbose?.(
        `[Membership] Inviting user (${matrixUserID}) is join room: ${roomID}`,
        LogContext.COMMUNICATION
      );
      userAgent.attachOnceConditional({
        id: roomID,
        roomMemberMembershipMonitor:
          userAgent.resolveAutoAcceptRoomMembershipOneTimeMonitor(
            // subscribe for events for a specific room
            roomID,
            userAgent.matrixClient.getUserId(),
            // once we have joined the room detach the subscription
            () => userAgent.detach(roomID)
          ),
      });

      await this.matrixRoomAdapter.inviteUserToRoom(
        elevatedAgent.matrixClient,
        roomID,
        userAgent.matrixClient
      );
    }
  }

  async getRoomsUserIsNotMember(
    matrixClient: MatrixClient,
    roomIDs: string[]
  ): Promise<string[]> {
    // Filter down to exclude the rooms the user is already a member of
    const joinedRooms = await this.matrixUserAdapter.getJoinedRooms(
      matrixClient
    );
    const applicableRoomIDs = roomIDs.filter(
      rId => !joinedRooms.find(joinedRoomId => joinedRoomId === rId)
    );
    if (applicableRoomIDs.length == 0) {
      this.logger.verbose?.(
        `User (${matrixClient.getUserId()}) is already in all rooms: ${roomIDs}`,
        LogContext.COMMUNICATION
      );
      return [];
    }
    return applicableRoomIDs;
  }

  async isUserInGroup(
    matrixClient: MatrixClient,
    groupID: string
  ): Promise<boolean> {
    // Filter down to exclude the rooms the user is already a member of
    const joinedGroups = await this.matrixUserAdapter.getJoinedGroups(
      matrixClient
    );
    const groupFound = joinedGroups.find(gID => gID === groupID);
    if (groupFound) {
      this.logger.verbose?.(
        `User (${matrixClient.getUserId()}) is already in group: ${groupID}`,
        LogContext.COMMUNICATION
      );
      return true;
    }
    return false;
  }

  async removeRoom(matrixRoomID: string) {
    try {
      const elevatedAgent = await this.getMatrixManagementAgentElevated();
      this.logger.verbose?.(
        `[Membership] Removing members from matrix room: ${matrixRoomID}`,
        LogContext.COMMUNICATION
      );
      const room = await this.matrixRoomAdapter.getMatrixRoom(
        elevatedAgent.matrixClient,
        matrixRoomID
      );
      const members = room.getMembers();
      for (const member of members) {
        // ignore matrix admin
        if (member.userId === elevatedAgent.matrixClient.getUserId()) continue;
        const userAgent = await this.matrixAgentPool.acquire(member.userId);
        await this.matrixRoomAdapter.removeUserFromRoom(
          elevatedAgent.matrixClient,
          matrixRoomID,
          userAgent.matrixClient
        );
      }
      this.logger.verbose?.(
        `[Membership] Removed members from room: ${room.name}`,
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

  async getRoomJoinRule(roomID: string): Promise<string> {
    const elevatedAgent = await this.getMatrixManagementAgentElevated();
    return await this.matrixRoomAdapter.getJoinRule(
      elevatedAgent.matrixClient,
      roomID
    );
  }

  async setMatrixRoomsGuestAccess(roomIDs: string[], allowGuests = true) {
    const elevatedAgent = await this.getMatrixManagementAgentElevated();

    try {
      for (const roomID of roomIDs) {
        if (roomID.length > 0) {
          await this.matrixRoomAdapter.changeRoomJoinRuleState(
            elevatedAgent.matrixClient,
            roomID,
            // not sure where to find the enums - reverse engineered this from synapse
            allowGuests ? 'public' : 'invite'
          );

          const oldRoom = await this.matrixRoomAdapter.getMatrixRoom(
            elevatedAgent.matrixClient,
            roomID
          );
          const rule = oldRoom.getJoinRule();
          this.logger.verbose?.(
            `Room ${roomID} join rule is now: ${rule}`,
            LogContext.COMMUNICATION
          );
        }
      }
      return true;
    } catch (error) {
      this.logger.error?.(
        `Unable to change guest access for rooms to (${
          allowGuests ? 'Public' : 'Private'
        }): ${error}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }
}
