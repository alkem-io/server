import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationAdminMembershipInput } from './dto';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { CommunicationAdminMembershipResult } from './dto/admin.communication.dto.membership.result';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { IRoomable } from '@domain/communication/room/roomable.interface';
import { CommunicationAdminRoomMembershipResult } from './dto/admin.communication.dto.room.result';
import { IUser } from '@domain/community/user/user.interface';

@Injectable()
export class AdminCommunicationService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private communicationService: CommunicationService,
    private communityService: CommunityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async communicationMembership(
    communicationData: CommunicationAdminMembershipInput
  ): Promise<CommunicationAdminMembershipResult> {
    this.logger.verbose?.(
      `communicationRoomMembership: ${communicationData.communityID}`,
      LogContext.COMMUNICATION
    );
    const community = await this.communityService.getCommunityOrFail(
      communicationData.communityID
    );
    const communityMembers = await this.communityService.getMembers(community);
    const communication = await this.communityService.getCommunication(
      community.id
    );

    const result = new CommunicationAdminMembershipResult(
      communication.id,
      communication.displayName
    );
    const updates = this.communicationService.getUpdates(communication);
    const updatesResult = await this.createCommunicationAdminRoomResult(
      updates,
      communityMembers
    );
    result.rooms.push(updatesResult);

    const discussions = this.communicationService.getDiscussions(communication);
    for (const discussion of discussions) {
      const discussionResult = await this.createCommunicationAdminRoomResult(
        discussion,
        communityMembers
      );
      result.rooms.push(discussionResult);
    }
    return result;
  }

  private async createCommunicationAdminRoomResult(
    roomable: IRoomable,
    communityMembers: IUser[]
  ): Promise<CommunicationAdminRoomMembershipResult> {
    const result = new CommunicationAdminRoomMembershipResult(
      roomable.id,
      roomable.displayName
    );
    result.roomID = roomable.communicationRoomID;
    result.members = await this.communicationAdapter.getRoomMembers(
      roomable.communicationRoomID
    );
    // check which ones are missing
    for (const communityMember of communityMembers) {
      const inCommunicationRoom = result.members.find(
        roomMember => roomMember === communityMember.communicationID
      );
      if (!inCommunicationRoom) {
        result.missingMembers.push(communityMember.communicationID);
      }
    }

    // check which ones are extra
    for (const roomMember of result.members) {
      const inCommunity = communityMembers.find(
        communityMember => communityMember.communicationID === roomMember
      );
      if (!inCommunity) {
        result.extraMembers.push(roomMember);
      }
    }
    return result;
  }
}
