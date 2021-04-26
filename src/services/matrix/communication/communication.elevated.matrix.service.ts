import { IMatrixUser } from '../user/user.matrix.interface';
import { MatrixCommunicationService } from './communication.matrix.service';
import { MatrixGroupEntityAdapter } from './group/group.communication.matrix.adapter';
import { IOpts as GroupOpts } from './group/group.communication.matrix.interface';
import { MatrixRoomEntityAdapter } from './room/room.communication.matrix.adapter';
import { IOpts as RoomOpts } from './room/room.communication.matrix.interface';

interface IMatrixElevatedCommunicationsService {
  createRoom: MatrixRoomEntityAdapter['createRoom'];
  createGroup: MatrixGroupEntityAdapter['createGroup'];
}

export class MatrixElevatedCommunicationService
  extends MatrixCommunicationService
  implements IMatrixElevatedCommunicationsService {
  async createRoom(options: RoomOpts) {
    return await this._roomEntityAdapter.createRoom(options);
  }
  async createGroup(options: GroupOpts, users?: IMatrixUser[]) {
    const groupId = await this._groupEntityAdapter.createGroup(options);
    await this._groupEntityAdapter.inviteUsersToGroup(groupId, users || []);

    return groupId;
  }
}
