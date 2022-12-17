import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixClient } from '../types/matrix.client.type';
import { IOpts } from './matrix.group.dto.options';

@Injectable()
export class MatrixGroupAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  // Maps from a groupID to an array of roomIDs
  // Todo: needs to be optimized!
  public async communityRoomsMap(
    matrixClient: MatrixClient
  ): Promise<Record<string, string[]>> {
    const communities = await matrixClient.getGroups();

    const roomMap: Record<string, string[]> = {};
    for (const community of communities) {
      //const result = await matrixClient.getGroupRooms(community.groupId);
      const rooms = await matrixClient.getGroupRooms(community.groupId);
      roomMap[community.groupId] = roomMap[community.groupId] || [];

      for (const room of rooms.chunk) {
        roomMap[community.groupId].push(room.room_id);
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

  public async inviteUserToGroup(
    adminClient: MatrixClient,
    groupId: string,
    matrixClient: MatrixClient
  ) {
    // need to cache those
    // get both the users that have invites and the ones which are already accepted
    const groupUsers = (await adminClient.getGroupUsers(groupId)).chunk as {
      user_id: string;
    }[];
    const groupInvitedUsers = (await adminClient.getGroupInvitedUsers(groupId))
      .chunk as {
      user_id: string;
    }[];
    try {
      const userId = matrixClient.getUserId();
      // if the user is part of the group skip invitations
      if (groupUsers.some(x => x.user_id === userId)) {
        this.logger.verbose?.(
          `[Membership] Ignoring group join request; User (${userId}) is already in the group: ${groupId}`,
          LogContext.COMMUNICATION
        );
        return;
      }
      if (groupInvitedUsers.some(x => x.user_id === userId)) {
        await matrixClient.acceptGroupInvite(groupId);
        return;
      }

      await adminClient.inviteUserToGroup(groupId, userId);

      this.logger.verbose?.(
        `Invited users to group: ${userId} - ${groupId}`,
        LogContext.COMMUNICATION
      );
    } catch (error: any) {
      // TODO: Find a way to handle `User already in group`
      this.logger.error(
        `Unable to add user to Matrix Group: ${error.message}`,
        LogContext.COMMUNICATION
      );
    }
  }
}
