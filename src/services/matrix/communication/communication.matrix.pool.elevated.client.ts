import { IMatrixUser } from '../user/user.matrix.interface';
import { MatrixCommunicationClient } from './communication.matrix.pool.client';
import { MatrixGroupEntityAdapter } from './group/group.communication.matrix.adapter';
import { IOpts as GroupOpts } from './group/group.communication.matrix.interface';
import { MatrixRoomEntityAdapter } from './room/room.communication.matrix.adapter';
import { IOpts as RoomOpts } from './room/room.communication.matrix.interface';

interface IMatrixElevatedCommunicationsClient {
  createRoom: MatrixRoomEntityAdapter['createRoom'];
  createGroup: MatrixGroupEntityAdapter['createGroup'];
}

export class MatrixElevatedCommunicationClient extends MatrixCommunicationClient
  implements IMatrixElevatedCommunicationsClient {
  async createRoom(options: RoomOpts) {
    return await this._roomEntityAdapter.createRoom(options);
  }
  async createGroup(options: GroupOpts, users?: IMatrixUser[]) {
    const groupId = await this._groupEntityAdapter.createGroup(options);
    await this._groupEntityAdapter.inviteUsersToGroup(groupId, users || []);

    return groupId;
  }
}
