import { IOpts as GroupOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.group.interface';
import { IRoomOpts as RoomOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.room.interface';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixAgent } from '../agent-pool/matrix.agent';

export class MatrixAgentElevated extends MatrixAgent {
  constructor(matrixClient: MatrixClient) {
    super(matrixClient);
  }

  async createRoom(options: RoomOpts) {
    return await this.roomEntityAdapter.createRoom(options);
  }

  async createGroup(options: GroupOpts) {
    return await this.groupEntityAdapter.createGroup(options);
  }

  async addUserToCommunityGroup(groupID: string, matrixUsername: string) {
    this.groupEntityAdapter.inviteUsersToGroup(groupID, [matrixUsername]);
  }

  async addUserToCommunityRoom(roomID: string, matrixUsername: string) {
    this.roomEntityAdapter.inviteUsersToRoom(roomID, [matrixUsername]);
  }
}
