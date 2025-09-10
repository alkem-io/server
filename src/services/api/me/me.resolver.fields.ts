import { Float, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { MeQueryResults } from '@services/api/me/dto';
import { IUser } from '@domain/community/user/user.interface';
import {
  AuthenticationException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { UserService } from '@domain/community/user/user.service';
import { MeService } from './me.service';
import { LogContext } from '@common/enums';
import { MySpaceResults } from './dto/my.journeys.results';
import { CommunityInvitationResult } from './dto/me.invitation.result';
import { CommunityApplicationResult } from './dto/me.application.result';
import { CommunityMembershipResult } from './dto/me.membership.result';
import { NotificationEventsFilterInput } from './dto/me.notification.event.filter.dto.input';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { PaginatedInAppNotifications } from '@core/pagination/paginated.in-app-notification';
import { PaginationArgs } from '@core/pagination';

@Resolver(() => MeQueryResults)
export class MeResolverFields {
  constructor(
    private meService: MeService,
    private userService: UserService,
    private inAppNotificationService: InAppNotificationService
  ) {}

  @ResolveField('notifications', () => PaginatedInAppNotifications, {
    nullable: false,
    description: 'Get all notifications for the logged in user.',
  })
  public async notificationsInApp(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: NotificationEventsFilterInput
  ): Promise<PaginatedInAppNotifications> {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return await this.inAppNotificationService.getPaginatedNotifications(
      agentInfo.userID,
      pagination,
      filter
    );
  }

  @ResolveField('notificationsUnreadCount', () => Number, {
    description:
      'The number of unread notifications for the current authenticated user.',
  })
  public async notificationsUnreadCount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('filter', { nullable: true }) filter?: NotificationEventsFilterInput
  ): Promise<number> {
    if (agentInfo.userID === '') {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return await this.inAppNotificationService.getRawNotificationsUnreadCount(
      agentInfo.userID,
      filter
    );
  }

  @ResolveField('id', () => String, {
    description: 'The query id',
  })
  public id(@CurrentUser() agentInfo: AgentInfo): string {
    return `me-${agentInfo.userID}`;
  }

  @ResolveField(() => IUser, {
    nullable: true,
    description:
      'The current authenticated User;  null if not yet registered on the platform',
  })
  async user(@CurrentUser() agentInfo: AgentInfo): Promise<IUser | null> {
    const email = agentInfo.email;
    if (!email) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier',
        LogContext.RESOLVER_FIELD
      );
    }
    // When the user is just registered, the agentInfo.userID is still null
    if (email && !agentInfo.userID) {
      return null;
    }

    return this.userService.getUserOrFail(agentInfo.userID);
  }

  @ResolveField('communityInvitationsCount', () => Number, {
    description:
      'The number of invitations the current authenticated user can act on.',
  })
  public async communityInvitationsCount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<number> {
    if (agentInfo.userID === '') {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsCountForUser(
      agentInfo.userID,
      states
    );
  }

  @ResolveField('communityInvitations', () => [CommunityInvitationResult], {
    description: 'The invitations the current authenticated user can act on.',
  })
  public async communityInvitations(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityInvitationResult[]> {
    if (agentInfo.userID === '') {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsForUser(
      agentInfo.userID,
      states
    );
  }

  @ResolveField('communityApplications', () => [CommunityApplicationResult], {
    description:
      'The community applications current authenticated user can act on.',
  })
  public async communityApplications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityApplicationResult[]> {
    if (agentInfo.userID === '') {
      throw new ValidationException(
        'Unable to retrieve applications as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityApplicationsForUser(
      agentInfo.userID,
      states
    );
  }

  @ResolveField(() => [CommunityMembershipResult], {
    description: 'The hierarchy of the Spaces the current user is a member.',
  })
  public spaceMembershipsHierarchical(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Spaces to return; if omitted return all journeys',
      nullable: true,
    })
    limit: number
  ): Promise<CommunityMembershipResult[]> {
    return this.meService.getSpaceMembershipsHierarchical(agentInfo, limit);
  }

  @ResolveField(() => [CommunityMembershipResult], {
    description: 'The Spaces the current user is a member of as a flat list.',
  })
  public spaceMembershipsFlat(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunityMembershipResult[]> {
    return this.meService.getSpaceMembershipsFlat(agentInfo);
  }

  @ResolveField(() => [MySpaceResults], {
    description: 'The Spaces I am contributing to',
  })
  public mySpaces(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Journeys to return; if omitted return latest 20 active Journeys.',
      nullable: true,
    })
    limit: number
  ): Promise<MySpaceResults[]> {
    return this.meService.getMySpaces(agentInfo, limit);
  }
}
