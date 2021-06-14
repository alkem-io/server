import { IMatrixUser } from './matrix.management.user.interface';
import { MatrixAgent } from '../agent-pool/matrix.agent';
import { MatrixGroupEntityAdapter } from '../adapter/matrix.adapter.group';
import { IOpts as GroupOpts } from '../adapter/matrix.adapter.group.interface';
import { MatrixRoomEntityAdapter } from '../adapter/matrix.adapater.room';
import { IOpts as RoomOpts } from '../adapter/matrix.adapter.room.interface';

interface IMatrixAgentElevated {
  createRoom: MatrixRoomEntityAdapter['createRoom'];
  createGroup: MatrixGroupEntityAdapter['createGroup'];
}

export class MatrixManagementAgentElevated extends MatrixAgent
  implements IMatrixAgentElevated {
  async createRoom(options: RoomOpts) {
    return await this._roomEntityAdapter.createRoom(options);
  }
  async createGroup(options: GroupOpts, users?: IMatrixUser[]) {
    const groupId = await this._groupEntityAdapter.createGroup(options);
    await this._groupEntityAdapter.inviteUsersToGroup(groupId, users || []);

    return groupId;
  }
}
