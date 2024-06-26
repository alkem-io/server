import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.new.member';
import { ICommunity } from './community.interface';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { SpaceType } from '@common/enums/space.type';
import { IContributor } from '../contributor/contributor.interface';

@Injectable()
export class CommunityEventsService {
  constructor(
    private contributionReporter: ContributionReporterService,
    private notificationAdapter: NotificationAdapter,
    private activityAdapter: ActivityAdapter
  ) {}

  public async registerCommunityNewMemberActivity(
    community: ICommunity,
    newContributor: IContributor,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputMemberJoined = {
      triggeredBy: agentInfo.userID,
      community: community,
      contributor: newContributor,
    };
    await this.activityAdapter.memberJoined(activityLogInput);
  }

  public async processCommunityNewMemberEvents(
    community: ICommunity,
    spaceID: string,
    displayName: string,
    agentInfo: AgentInfo,
    newContributor: IContributor
  ) {
    // TODO: community just needs to know the level, not the type
    // Send the notification
    const notificationInput: NotificationInputCommunityNewMember = {
      contributorID: newContributor.id,
      triggeredBy: agentInfo.userID,
      community: community,
    };
    await this.notificationAdapter.communityNewMember(notificationInput);

    // Record the contribution events
    switch (community.type) {
      case SpaceType.SPACE:
        this.contributionReporter.spaceJoined(
          {
            id: community.parentID,
            name: displayName,
            space: spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
      default: // Challenge, Opportunity, VIRTUAL_CONTRIBUTOR, BLANK_SLATE...
        this.contributionReporter.subspaceJoined(
          {
            id: community.parentID,
            name: displayName,
            space: spaceID,
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
