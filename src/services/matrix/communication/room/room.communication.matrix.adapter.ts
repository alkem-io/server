import {
  IOpts,
  Preset,
  Visibility,
} from './room.communication.matrix.interface';

export class MatrixRoomEntityAdapter {
  constructor(private _client: any) {}

  public async setDmRoom(roomId: string, userId: string) {
    // NOT OPTIMIZED - needs caching
    const dmRooms = this.dmRooms();

    dmRooms[userId] = [roomId];
    await this._client.setAccountData('m.direct', dmRooms);
  }

  // there could be more than one dm room per user
  public dmRooms(): Record<string, string[]> {
    let mDirectEvent = this._client.getAccountData('m.direct');
    mDirectEvent = mDirectEvent ? mDirectEvent.getContent() : {};

    const userId = this._client.getUserId();

    // there is a bug in the sdk
    const selfDMs = mDirectEvent[userId];
    if (selfDMs && selfDMs.length) {
      // it seems that two users can have multiple DM rooms between them and only one needs to be active
      // they have fixed the issue inside the react-sdk instead of the js-sdk...
    }

    return mDirectEvent;
  }

  public async createRoom(options: IOpts): Promise<string> {
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

    const room = await this._client.createRoom(createOpts);
    if (communityId) {
      await this._client.addRoomToGroup(communityId, room.room_id, false);
    }

    return room.room_id;
  }
}
