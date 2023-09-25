import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.new.member';
import { ICommunity } from './community.interface';
import { CommunityType } from '@common/enums/community.type';

@Injectable()
export class CommunityEventsService {
  constructor(
    private contributionReporter: ContributionReporterService,
    private notificationAdapter: NotificationAdapter
  ) {}

  public async processCommunityNewMemberEvents(
    community: ICommunity,
    displayName: string,
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputCommunityNewMember = {
      userID: agentInfo.userID,
      triggeredBy: agentInfo.userID,
      community: community,
    };
    await this.notificationAdapter.communityNewMember(notificationInput);

    // Record the contribution events
    switch (community.type) {
      case CommunityType.SPACE:
        this.contributionReporter.spaceJoined(
          {
            id: community.parentID,
            name: displayName,
            space: community.spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
      case CommunityType.CHALLENGE:
        this.contributionReporter.challengeJoined(
          {
            id: community.parentID,
            name: displayName,
            space: community.spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
      case CommunityType.OPPORTUNITY:
        this.contributionReporter.opportunityJoined(
          {
            id: community.parentID,
            name: displayName,
            space: community.spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
    }
  }
}
