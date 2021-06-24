import { IMatrixUser } from '@src/services/platform/matrix/management/matrix.management.user.interface';
import { MatrixAgent } from '@src/services/platform/matrix/agent-pool/matrix.agent';
import { MatrixGroupEntityAdapter } from '@src/services/platform/matrix/adapter/matrix.adapter.group';
import { IOpts as GroupOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.group.interface';
import { MatrixRoomEntityAdapter } from '@src/services/platform/matrix/adapter';
import { IRoomOpts as RoomOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.room.interface';

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

  async addUserToCommunityRooms() {
    return undefined;
  }
}
