import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IContent } from 'matrix-js-sdk';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixClient } from '../types/matrix.client.type';
import { Preset, Visibility } from './matrix.room.dto.create.options';
import { IRoomOpts } from './matrix.room.dto.options';

@Injectable()
export class MatrixRoomAdapterService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async setDmRoom(matrixClient: MatrixClient, roomId: string, userId: string) {
    // NOT OPTIMIZED - needs caching
    const dmRooms = this.dmRooms(matrixClient);

    dmRooms[userId] = [roomId];
    await matrixClient.setAccountData('m.direct', dmRooms);
  }

  // there could be more than one dm room per user
  dmRooms(matrixClient: MatrixClient): Record<string, string[]> {
    const mDirectEvent = matrixClient.getAccountData('m.direct');
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

    const defaultPreset = Preset.PrivateChat;
    createOpts.preset = createOpts.preset || defaultPreset;
    createOpts.visibility = createOpts.visibility || Visibility.Private;

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

  async inviteUsersToRoom(
    matrixClient: MatrixClient,
    roomID: string,
    matrixUsernames: string[]
  ) {
    // need to cache those
    const room = await matrixClient.getRoom(roomID);

    for (const matrixUsername of matrixUsernames) {
      // not very well documented but we can validate whether the user has membership like this
      // seen in https://github.com/matrix-org/matrix-js-sdk/blob/3c36be9839091bf63a4850f4babed0c976d48c0e/src/models/room-member.ts#L29
      if (
        room.hasMembershipState(matrixUsername, 'join') === false &&
        room.hasMembershipState(matrixUsername, 'invite') === false
      ) {
        await matrixClient.invite(roomID, matrixUsername);
        this.logger.verbose?.(
          `invited user to room: ${matrixUsername} - ${roomID}`,
          LogContext.COMMUNICATION
        );
      }
    }
  }
}
