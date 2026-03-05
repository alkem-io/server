import { LogContext } from '@common/enums';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { PaginationArgs } from '@core/pagination';
import { PaginatedInAppNotifications } from '@core/pagination/paginated.in-app-notification';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Args, Float, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { MeQueryResults } from '@services/api/me/dto';
import { CurrentActor } from '@src/common/decorators';
import { CommunityApplicationResult } from './dto/me.application.result';
import { MeConversationsResult } from './dto/me.conversations.result';
import { CommunityInvitationResult } from './dto/me.invitation.result';
import { CommunityMembershipResult } from './dto/me.membership.result';
import { NotificationEventsFilterInput } from './dto/me.notification.event.filter.dto.input';
import { MySpaceResults } from './dto/my.journeys.results';
import { MeService } from './me.service';

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
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: NotificationEventsFilterInput
  ): Promise<PaginatedInAppNotifications> {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { actorContext }
      );
    }

    return await this.inAppNotificationService.getPaginatedNotifications(
      actorContext.actorID,
      pagination,
      filter
    );
  }

  @ResolveField('notificationsUnreadCount', () => Number, {
    description:
      'The total number of unread notifications for the current authenticated user across all notification types.',
  })
  public async notificationsUnreadCount(
    @CurrentActor() actorContext: ActorContext
  ): Promise<number> {
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Unable to retrieve unread notifications count; no userID provided.',
        LogContext.IN_APP_NOTIFICATION
      );
    }
    // Always return the total unread count, regardless of any filtering on notifications
    return await this.inAppNotificationService.getRawNotificationsUnreadCount(
      actorContext.actorID
    );
  }

  @ResolveField('id', () => String, {
    description: 'The query id',
  })
  public id(@CurrentActor() actorContext: ActorContext): string {
    return `me-${actorContext.actorID}`;
  }

  @ResolveField(() => IUser, {
    nullable: true,
    description:
      'The current authenticated User;  null if not yet registered on the platform',
  })
  async user(
    @CurrentActor() actorContext: ActorContext
  ): Promise<IUser | null> {
    // Anonymous / guest requests do not carry identifiers; expose null instead of failing the whole query.
    if (!actorContext.actorID || actorContext.isAnonymous) {
      return null;
    }

    return this.userLookupService.getUserByIdOrFail(actorContext.actorID);
  }

  @ResolveField('communityInvitationsCount', () => Number, {
    description:
      'The number of invitations the current authenticated user can act on.',
  })
  public async communityInvitationsCount(
    @CurrentActor() actorContext: ActorContext,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<number> {
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsCountForUser(
      actorContext.actorID,
      states
    );
  }

  @ResolveField('communityInvitations', () => [CommunityInvitationResult], {
    description: 'The invitations the current authenticated user can act on.',
  })
  public async communityInvitations(
    @CurrentActor() actorContext: ActorContext,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityInvitationResult[]> {
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Unable to retrieve invitations as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityInvitationsForUser(
      actorContext.actorID,
      states
    );
  }

  @ResolveField('communityApplications', () => [CommunityApplicationResult], {
    description:
      'The community applications current authenticated user can act on.',
  })
  public async communityApplications(
    @CurrentActor() actorContext: ActorContext,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityApplicationResult[]> {
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Unable to retrieve applications as no userID provided.',
        LogContext.COMMUNITY
      );
    }
    return this.meService.getCommunityApplicationsForUser(
      actorContext.actorID,
      states
    );
  }

  @ResolveField(() => [CommunityMembershipResult], {
    description: 'The hierarchy of the Spaces the current user is a member.',
  })
  public spaceMembershipsHierarchical(
    @CurrentActor() actorContext: ActorContext,
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
    @CurrentActor() actorContext: ActorContext
  ): Promise<CommunityMembershipResult[]> {
    return this.meService.getSpaceMembershipsFlat(actorContext);
  }

  @ResolveField(() => [MySpaceResults], {
    description: 'The Spaces I am contributing to',
  })
  public mySpaces(
    @CurrentActor() actorContext: ActorContext,
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
    @CurrentActor() actorContext: ActorContext
  ): Promise<MeConversationsResult> {
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    // Return an empty object - the fields will be resolved by MeConversationsResolverFields
    return {} as MeConversationsResult;
  }
}
