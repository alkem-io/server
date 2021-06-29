import { IOpts } from '@src/services/platform/matrix/adapter/matrix.adapter.group.interface';

export class MatrixGroupEntityAdapter {
  constructor(private _client: any) {}

  public communityRooms(): Record<string, string[]> {
    const communities = this._client.getGroups();
    const communityRooms = this._client.getRooms();

    const roomMap: Record<string, string[]> = {};
    for (const community of communities) {
      roomMap[community.groupId] = roomMap[community.groupId] || [];

      for (const room of communityRooms) {
        if (room.groupId === community.groupId) {
          roomMap[community.groupId].push(room.roomId);
        }
      }
    }

    return roomMap;
  }

  public async createGroup(options: IOpts): Promise<string> {
    const { groupId, profile } = options;

    const group = await this._client.createGroup({
      localpart: groupId,
      profile: profile,
    });

    // await this._client.setGroupPublicity(
    //   group.group_id,
    //   true /* Make the group public so people can join it */
    // );

    await this._client.setGroupJoinPolicy(group.group_id, {
      type: 'invite' /* Allow users with invites to join this group */,
    });

    return group.group_id;
  }

  public async inviteUsersToGroup(groupId: string, matrixUsernames: string[]) {
    for (const matrixUsername of matrixUsernames) {
      await this._client.inviteUserToGroup(groupId, matrixUsername);
    }
  }
}
