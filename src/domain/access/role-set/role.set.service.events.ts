import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.new.member';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { SpaceType } from '@common/enums/space.type';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IRoleSet } from './role.set.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';

@Injectable()
export class RoleSetEventsService {
  constructor(
    private contributionReporter: ContributionReporterService,
    private notificationAdapter: NotificationAdapter,
    private activityAdapter: ActivityAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public async registerCommunityNewMemberActivity(
    roleSet: IRoleSet,
    newContributor: IContributor,
    agentInfo: AgentInfo
  ) {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const activityLogInput: ActivityInputMemberJoined = {
      triggeredBy: agentInfo.userID,
      community,
      contributor: newContributor,
    };
    await this.activityAdapter.memberJoined(activityLogInput);
  }

  public async processCommunityNewMemberEvents(
    roleSet: IRoleSet,
    levelZeroSpaceID: string,
    displayName: string,
    agentInfo: AgentInfo,
    newContributor: IContributor
  ) {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);
    // TODO: community just needs to know the level, not the type
    // Send the notification
    const notificationInput: NotificationInputCommunityNewMember = {
      contributorID: newContributor.id,
      triggeredBy: agentInfo.userID,
      community,
    };
    await this.notificationAdapter.communityNewMember(notificationInput);

    // Record the contribution events
    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      roleSet.id
    );
    switch (space.type) {
      case SpaceType.SPACE:
        this.contributionReporter.spaceJoined(
          {
            id: community.parentID,
            name: displayName,
            space: levelZeroSpaceID,
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
            space: levelZeroSpaceID,
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