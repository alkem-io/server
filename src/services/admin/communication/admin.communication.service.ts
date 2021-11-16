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
    const communication = await this.communityService.getCommunication(
      community.id
    );

    const result = new CommunicationAdminMembershipResult(
      communication.id,
      communication.displayName
    );
    const updates = this.communicationService.getUpdates(communication);
    const updatesResult = await this.createCommunicationAdminRoomResult(
      updates
    );
    result.rooms.push(updatesResult);

    const discussions = this.communicationService.getDiscussions(communication);
    for (const discussion of discussions) {
      const discussionResult = await this.createCommunicationAdminRoomResult(
        discussion
      );
      result.rooms.push(discussionResult);
    }
    return result;
  }

  private async createCommunicationAdminRoomResult(
    roomable: IRoomable
  ): Promise<CommunicationAdminRoomMembershipResult> {
    const result = new CommunicationAdminRoomMembershipResult(
      roomable.id,
      roomable.displayName
    );
    result.members = await this.communicationAdapter.getRoomMembers(
      roomable.communicationRoomID
    );
    return result;
  }
}
