import { LogContext } from '@common/enums';
import { MatrixEntityNotFoundException } from '@common/exceptions';
import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { DirectRoomResult } from '@domain/community/user/dto/user.dto.communication.room.direct.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Direction, IContent, TimelineWindow } from 'matrix-js-sdk';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixMessageAdapter } from '../adapter-message/matrix.message.adapter';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixRoom } from './matrix.room';
import { Preset, Visibility } from './matrix.room.dto.create.options';
import { IRoomOpts } from './matrix.room.dto.options';
import { MatrixRoomResponseMessage } from './matrix.room.dto.response.message';

@Injectable()
export class MatrixRoomAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private matrixMessageAdapter: MatrixMessageAdapter
  ) {}

  async storeDirectMessageRoom(
    matrixClient: MatrixClient,
    roomId: string,
    userId: string
  ) {
    // NOT OPTIMIZED - needs caching
    const dmRooms = this.getDirectMessageRoomsMap(matrixClient);

    dmRooms[userId] = [roomId];
    await matrixClient.setAccountData('m.direct', dmRooms);
  }

  // there could be more than one dm room per user
  getDirectMessageRoomsMap(
    matrixClient: MatrixClient
  ): Record<string, string[]> {
    const mDirectEvent = matrixClient.getAccountData('m.direct');
    // todo: tidy up this logic
    const eventContent = mDirectEvent
      ? mDirectEvent.getContent<IContent>()
      : {};

    const userId = matrixClient.getUserId();

    // there is a bug in the sdk
    const selfDMs = eventContent[userId];
    if (selfDMs && selfDMs.length) {
      // it seems that two users can have multiple DM rooms between them and only one needs to be active
      // they have fixed the issue inside the react-sdk instead of the js-sdk...
    }

    return eventContent;
  }

  async createRoom(
    matrixClient: MatrixClient,
    options: IRoomOpts
  ): Promise<string> {
    const { dmUserId, groupId, metadata } = options;
    // adjust options
    const createOpts = options.createOpts || {};

    // all rooms will by default be public
    const defaultPreset = Preset.PublicChat;
    createOpts.preset = createOpts.preset || defaultPreset;
    // all rooms will by default be public and visible - need to revise this
    // once the Synapse server is community accessible
    createOpts.visibility = createOpts.visibility || Visibility.Public;

    if (dmUserId && createOpts.invite === undefined) {
      createOpts.invite = [dmUserId];
    }
    if (dmUserId && createOpts.is_direct === undefined) {
      createOpts.is_direct = true;
    }

    const roomResult = await matrixClient.createRoom(createOpts);
    const roomID = roomResult.room_id;
    this.logger.verbose?.(
      `[MatrixRoom] Created new room with id: ${roomID}`,
      LogContext.COMMUNICATION
    );

    if (groupId) {
      await matrixClient.addRoomToGroup(groupId, roomResult.room_id, true);
    }

    if (metadata) {
      await matrixClient.setRoomAccountData(
        roomID,
        'alkemio.metadata',
        metadata
      );
    }

    return roomID;
  }

  async joinRoomSafe(
    matrixClient: MatrixClient,
    roomID: string
  ): Promise<void> {
    if (roomID === '')
      throw new MatrixEntityNotFoundException(
        'No room ID specified',
        LogContext.COMMUNICATION
      );

    try {
      await matrixClient.joinRoom(roomID);
    } catch (ex: any) {
      this.logger.error?.(
        `[Membership] Exception user joining a room (user: ${matrixClient.getUserId()}) room: ${roomID}) - ${ex.toString()}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async changeRoomJoinRuleState(
    matrixClient: MatrixClient,
    roomID: string,
    state: string
  ): Promise<void> {
    if (roomID === '')
      throw new MatrixEntityNotFoundException(
        'No room ID specified',
        LogContext.COMMUNICATION
      );

    await matrixClient.sendStateEvent(roomID, 'm.room.join_rules', {
      join_rule: state,
    });
  }

  public async getJoinRule(
    adminMatrixClient: MatrixClient,
    roomID: string
  ): Promise<string> {
    const room = await this.getMatrixRoom(adminMatrixClient, roomID);
    const roomState = room.currentState;
    return roomState.getJoinRule();
  }

  async getMatrixRoom(
    adminMatrixClient: MatrixClient,
    roomID: string
  ): Promise<MatrixRoom> {
    if (roomID === '')
      throw new MatrixEntityNotFoundException(
        'No room ID specified',
        LogContext.COMMUNICATION
      );
    // need to cache those
    const room = await adminMatrixClient.getRoom(roomID);
    if (!room) {
      throw new MatrixEntityNotFoundException(
        `Unable to locate room: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
    return room;
  }

  async logRoomMembership(adminMatrixClient: MatrixClient, roomID: string) {
    const members = await this.getMatrixRoomMembers(adminMatrixClient, roomID);
    this.logger.verbose?.(
      `[Membership] Members for room (${roomID}): ${members}`,
      LogContext.COMMUNICATION
    );
  }
  async inviteUserToRoom(
    adminMatrixClient: MatrixClient,
    roomID: string,
    matrixClient: MatrixClient
  ) {
    const room = await this.getMatrixRoom(adminMatrixClient, roomID);

    // not very well documented but we can validate whether the user has membership like this
    // seen in https://github.com/matrix-org/matrix-js-sdk/blob/3c36be9839091bf63a4850f4babed0c976d48c0e/src/models/room-member.ts#L29
    const userId = matrixClient.getUserId();
    if (room.hasMembershipState(userId, 'join')) {
      return;
    }
    if (room.hasMembershipState(userId, 'invite')) {
      await matrixClient.joinRoom(room.roomId);
      return;
    }

    await adminMatrixClient.invite(roomID, userId);
    this.logger.verbose?.(
      `invited user to room: ${userId} - ${roomID}`,
      LogContext.COMMUNICATION
    );
  }

  async removeUserFromRoom(
    adminMatrixClient: MatrixClient,
    roomID: string,
    matrixClient: MatrixClient
  ) {
    const matrixUserID = matrixClient.getUserId();
    try {
      this.logger.verbose?.(
        `[Membership] User (${matrixUserID}) being removed from room: ${roomID}`,
        LogContext.COMMUNICATION
      );

      // force the user to leave
      // https://github.com/matrix-org/matrix-js-sdk/blob/b2d83c1f80b53ae3ca396ac102edf27bfbbd7015/src/client.ts#L4354
      await adminMatrixClient.kick(roomID, matrixUserID);
    } catch (error) {
      this.logger.verbose?.(
        `Unable to remove user (${matrixUserID}) from rooms (${roomID}): ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async getAllRoomEvents(client: MatrixClient, matrixRoom: MatrixRoom) {
    // do NOT use the deprecated room.timeline property
    const timeline = matrixRoom.getLiveTimeline();
    const loadedEvents = timeline.getEvents();
    const lastKnownEvent = loadedEvents[loadedEvents.length - 1];
    // got the idea from - components/structures/TimelinePanel.tsx in matrix-react-sdk
    const timelineWindow = new TimelineWindow(
      client,
      timeline.getTimelineSet()
    );

    // need to set an anchor on the last known event and load from there
    if (lastKnownEvent) {
      await timelineWindow.load(lastKnownEvent.getId(), 1000);
      // atempt to paginate while we have outstanding messages
      while (timelineWindow.canPaginate(Direction.Backward)) {
        // do the actual event loading in memory
        await timelineWindow.paginate(Direction.Backward, 1000);
      }
    }

    return timelineWindow.getEvents();
  }

  async convertMatrixRoomToDirectRoom(
    matrixClient: MatrixClient,
    matrixRoom: MatrixRoom,
    receiverMatrixID: string
  ): Promise<DirectRoomResult> {
    const roomResult = new DirectRoomResult();
    roomResult.id = matrixRoom.roomId;
    roomResult.messages = await this.getMatrixRoomTimelineAsMessages(
      matrixClient,
      matrixRoom
    );
    roomResult.receiverID = receiverMatrixID;

    return roomResult;
  }

  async convertMatrixRoomToCommunityRoom(
    matrixClient: MatrixClient,
    matrixRoom: MatrixRoom
  ): Promise<CommunicationRoomResult> {
    const roomResult = new CommunicationRoomResult();
    roomResult.id = matrixRoom.roomId;
    roomResult.messages = await this.getMatrixRoomTimelineAsMessages(
      matrixClient,
      matrixRoom
    );
    roomResult.displayName = matrixRoom.name;

    return roomResult;
  }

  async getMatrixRoomTimelineAsMessages(
    matrixClient: MatrixClient,
    matrixRoom: MatrixRoom
  ): Promise<CommunicationMessageResult[]> {
    this.logger.verbose?.(
      `[MatrixRoom] Obtaining messages on room: ${matrixRoom.name}`,
      LogContext.COMMUNICATION
    );

    const timelineEvents = await this.getAllRoomEvents(
      matrixClient,
      matrixRoom
    );
    if (timelineEvents) {
      return await this.convertMatrixTimelineToMessages(timelineEvents);
    }
    return [];
  }

  async convertMatrixTimelineToMessages(
    timeline: MatrixRoomResponseMessage[]
  ): Promise<CommunicationMessageResult[]> {
    const messages: CommunicationMessageResult[] = [];

    for (const timelineMessage of timeline) {
      if (this.matrixMessageAdapter.isEventToIgnore(timelineMessage)) continue;
      const message =
        this.matrixMessageAdapter.convertFromMatrixMessage(timelineMessage);

      messages.push(message);
    }
    this.logger.verbose?.(
      `[MatrixRoom] Timeline converted: ${timeline.length} events ==> ${messages.length} messages`,
      LogContext.COMMUNICATION
    );
    return messages;
  }

  async getMatrixRoomMembers(
    adminMatrixClient: MatrixClient,
    matrixRoomID: string
  ): Promise<string[]> {
    this.logger.verbose?.(
      `[MatrixRoom] Obtaining members on room: ${matrixRoomID}`,
      LogContext.COMMUNICATION
    );
    const room = await this.getMatrixRoom(adminMatrixClient, matrixRoomID);
    const roomMembers = room.getMembers();
    const usersIDs: string[] = [];
    for (const roomMember of roomMembers) {
      // skip the elevated admin
      if (roomMember.userId === adminMatrixClient.getUserId()) continue;

      if (roomMember.membership === 'join') {
        usersIDs.push(roomMember.userId);
      }
    }
    return usersIDs;
  }
}
