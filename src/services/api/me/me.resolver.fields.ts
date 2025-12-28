import { Float, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { ActorContext } from '@core/actor-context';
import { MeQueryResults } from '@services/api/me/dto';
import { IUser } from '@domain/community/user/user.interface';
import { ForbiddenException, ValidationException } from '@common/exceptions';
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
import { MeConversationsResult } from '@services/api/me/dto';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@Resolver(() => MeQueryResults)
export class MeResolverFields {
  constructor(
    private meService: MeService,
    private userLookupService: UserLookupService,
    private inAppNotificationService: InAppNotificationService
  ) {}

  @ResolveField('notifications', () => PaginatedInAppNotifications, {
    nullable: false,
    description: 'Get all notifications for the logged in user.',
  })
  public async notificationsInApp(
    @CurrentUser() actorContext: ActorContext,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: NotificationEventsFilterInput
  ): Promise<PaginatedInAppNotifications> {
    if (!actorContext.actorId) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { actorContext }
      );
    }

    return await this.inAppNotificationService.getPaginatedNotifications(
      actorContext.actorId,
      pagination,
      filter
    );
  }

  @ResolveField('notificationsUnreadCount', () => Number, {
    description:
      'The total number of unread notifications for the current authenticated user across all notification types.',
  })
  public async notificationsUnreadCount(
    @CurrentUser() actorContext: ActorContext
  ): Promise<number> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve unread notifications count; no userID provided.',
        LogContext.IN_APP_NOTIFICATION
      );
    }
    // Always return the total unread count, regardless of any filtering on notifications
    return await this.inAppNotificationService.getRawNotificationsUnreadCount(
      actorContext.actorId
    );
  }

  @ResolveField('id', () => String, {
    description: 'The query id',
  })
  public id(@CurrentUser() actorContext: ActorContext): string {
    return `me-${actorContext.actorId}`;
  }

  @ResolveField(() => IUser, {
    nullable: true,
    description:
      'The current authenticated User;  null if not yet registered on the platform',
  })
  async user(@CurrentUser() actorContext: ActorContext): Promise<IUser | null> {
    const { actorId, isAnonymous } = actorContext;

    // Anonymous / guest requests do not carry identifiers; expose null instead of failing the whole query.
    if (isAnonymous || !actorId) {
      return null;
    }

    return this.userLookupService.getUserByIdOrFail(actorId);
  }

  @ResolveField('communityInvitationsCount', () => Number, {
    description:
      'The number of invitations the current authenticated user can act on.',
  })
  public async communityInvitationsCount(
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<number> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsCountForUser(
      actorContext.actorId,
      states
    );
  }

  @ResolveField('communityInvitations', () => [CommunityInvitationResult], {
    description: 'The invitations the current authenticated user can act on.',
  })
  public async communityInvitations(
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityInvitationResult[]> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsForUser(
      actorContext.actorId,
      states
    );
  }

  @ResolveField('communityApplications', () => [CommunityApplicationResult], {
    description:
      'The community applications current authenticated user can act on.',
  })
  public async communityApplications(
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityApplicationResult[]> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve applications as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityApplicationsForUser(
      actorContext.actorId,
      states
    );
  }

  @ResolveField(() => [CommunityMembershipResult], {
    description: 'The hierarchy of the Spaces the current user is a member.',
  })
  public spaceMembershipsHierarchical(
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Spaces to return; if omitted return all journeys',
      nullable: true,
    })
    limit: number
  ): Promise<CommunityMembershipResult[]> {
    return this.meService.getSpaceMembershipsHierarchical(actorContext, limit);
  }

  @ResolveField(() => [CommunityMembershipResult], {
    description: 'The Spaces the current user is a member of as a flat list.',
  })
  public spaceMembershipsFlat(
    @CurrentUser() actorContext: ActorContext
  ): Promise<CommunityMembershipResult[]> {
    return this.meService.getSpaceMembershipsFlat(actorContext);
  }

  @ResolveField(() => [MySpaceResults], {
    description: 'The Spaces I am contributing to',
  })
  public mySpaces(
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Journeys to return; if omitted return latest 20 active Journeys.',
      nullable: true,
    })
    limit: number
  ): Promise<MySpaceResults[]> {
    return this.meService.getMySpaces(actorContext, limit);
  }

  @ResolveField(() => MeConversationsResult, {
    description: 'The conversations the current authenticated user is part of.',
    nullable: false,
  })
  public async conversations(
    @CurrentUser() actorContext: ActorContext
  ): Promise<MeConversationsResult> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    // Return an empty object - the fields will be resolved by MeConversationsResolverFields
    return {} as MeConversationsResult;
  }
}
