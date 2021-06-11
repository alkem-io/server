import { IMatrixUser } from '../user/user.matrix.interface';
import { MatrixWrapperClient } from './matrix.wrapper.pool.client';
import { MatrixGroupEntityAdapter } from '../adapter/group.communication.matrix.adapter';
import { IOpts as GroupOpts } from '../adapter/group.communication.matrix.interface';
import { MatrixRoomEntityAdapter } from '../adapter/room.communication.matrix.adapter';
import { IOpts as RoomOpts } from '../adapter/room.communication.matrix.interface';

interface IMatrixWrapperClientElevated {
  createRoom: MatrixRoomEntityAdapter['createRoom'];
  createGroup: MatrixGroupEntityAdapter['createGroup'];
}

export class MatrixWrapperClientElevated extends MatrixWrapperClient
  implements IMatrixWrapperClientElevated {
  async createRoom(options: RoomOpts) {
    return await this._roomEntityAdapter.createRoom(options);
  }
  async createGroup(options: GroupOpts, users?: IMatrixUser[]) {
    const groupId = await this._groupEntityAdapter.createGroup(options);
    await this._groupEntityAdapter.inviteUsersToGroup(groupId, users || []);

    return groupId;
  }
}
