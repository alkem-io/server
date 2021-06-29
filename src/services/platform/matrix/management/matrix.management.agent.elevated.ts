import { IOpts as GroupOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.group.interface';
import { IRoomOpts as RoomOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.room.interface';
import { IMatrixUser } from '../user/matrix.user.interface';
import { MatrixClient } from '../agent-pool/matrix.client.types';
import { MatrixAgent } from '../agent-pool/matrix.agent';

export class MatrixAgentElevated extends MatrixAgent {
  constructor(matrixClient: MatrixClient) {
    super(matrixClient);
  }

  async createRoom(options: RoomOpts) {
    return await this.roomEntityAdapter.createRoom(options);
  }
  async createGroup(options: GroupOpts, users?: IMatrixUser[]) {
    const groupId = await this.groupEntityAdapter.createGroup(options);
    await this.groupEntityAdapter.inviteUsersToGroup(groupId, users || []);

    return groupId;
  }

  async addUserToCommunityRooms() {
    return undefined;
  }
}
