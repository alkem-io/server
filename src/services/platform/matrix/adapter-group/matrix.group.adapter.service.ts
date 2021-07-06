import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixClient } from '../types/matrix.client.type';
import { IOpts } from './matrix.group.dto.options';

@Injectable()
export class MatrixGroupAdapterService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getRoomIdsForGroup(
    matrixClient: MatrixClient,
    groupID: string
  ): Promise<string[]> {
    const groupsToRoomsMap = this.communityRoomsMap(matrixClient);
    return groupsToRoomsMap[groupID];
  }

  // Maps from a groupID to an array of roomIDs
  // Todo: needs to be optimized!
  public communityRoomsMap(
    matrixClient: MatrixClient
  ): Record<string, string[]> {
    const communities = matrixClient.getGroups();
    const communityRooms = matrixClient.getRooms();

    const roomMap: Record<string, string[]> = {};
    for (const community of communities) {
      roomMap[community.groupId] = roomMap[community.groupId] || [];

      for (const room of communityRooms) {
        if (room.groupID === community.groupId) {
          roomMap[community.groupId].push(room.roomId);
        }
      }
    }

    return roomMap;
  }

  public async createGroup(
    matrixClient: MatrixClient,
    options: IOpts
  ): Promise<string> {
    const { groupId, profile } = options;

    const group = await matrixClient.createGroup({
      localpart: groupId,
      profile: profile,
    });

    // await this._client.setGroupPublicity(
    //   group.group_id,
    //   true /* Make the group public so people can join it */
    // );

    await matrixClient.setGroupJoinPolicy(group.group_id, {
      type: 'invite' /* Allow users with invites to join this group */,
    });

    return group.group_id;
  }

  public async inviteUsersToGroup(
    matrixClient: MatrixClient,
    groupId: string,
    matrixUsernames: string[]
  ) {
    for (const matrixUsername of matrixUsernames) {
      await matrixClient.inviteUserToGroup(groupId, matrixUsername);
      this.logger.verbose?.(
        `Invited users to group: ${matrixUsername} - ${groupId}`,
        LogContext.COMMUNICATION
      );
    }
  }
}
