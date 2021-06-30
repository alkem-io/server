import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixClient } from '../types/matrix.client.type';
import { Preset, Visibility } from '../types/matrix.room.create.options.type';
import { IRoomOpts } from '../types/matrix.room.options.type';

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
    let mDirectEvent = matrixClient.getAccountData('m.direct');
    mDirectEvent = mDirectEvent ? mDirectEvent.getContent() : {};

    const userId = matrixClient.getUserId();

    // there is a bug in the sdk
    const selfDMs = mDirectEvent[userId];
    if (selfDMs && selfDMs.length) {
      // it seems that two users can have multiple DM rooms between them and only one needs to be active
      // they have fixed the issue inside the react-sdk instead of the js-sdk...
    }

    return mDirectEvent;
  }

  async createRoom(
    matrixClient: MatrixClient,
    options: IRoomOpts
  ): Promise<string> {
    const { dmUserId, communityId } = options;
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

    const room = await matrixClient.createRoom(createOpts);
    if (communityId) {
      await matrixClient.addRoomToGroup(communityId, room.room_id, false);
    }

    return room.room_id;
  }

  async inviteUsersToRoom(
    matrixClient: MatrixClient,
    roomID: string,
    matrixUsernames: string[]
  ) {
    for (const matrixUsername of matrixUsernames) {
      await matrixClient.invite(roomID, matrixUsername);
      this.logger.verbose?.(
        `invited user to room: ${matrixUsername} - ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
  }
}
