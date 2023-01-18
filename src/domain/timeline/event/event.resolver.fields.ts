import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { Profiling } from '@common/decorators/profiling.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ICardProfile } from '@domain/collaboration/card-profile/card.profile.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { IUser } from '@domain/community';
import { UserService } from '@domain/community/user/user.service';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';

@Resolver(() => ICalendarEvent)
export class CalendarEventResolverFields {
  constructor(
    private calendarEventService: CalendarEventService,
    private userService: UserService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: false,
    description: 'The user that created this CalendarEvent',
  })
  async createdBy(@Parent() calendarEvent: ICalendarEvent): Promise<IUser> {
    const createdBy = calendarEvent.createdBy;
    if (!createdBy) {
      throw new EntityNotInitializedException(
        'CreatedBy not set on CalendarEvent',
        LogContext.CALENDAR
      );
    }
    return await this.userService.getUserOrFail(createdBy);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => ICardProfile, {
    nullable: true,
    description: 'The CardProfile for this Card.',
  })
  @Profiling.api
  async profile(
    @Parent() calendarEvent: ICalendarEvent
  ): Promise<ICardProfile> {
    return await this.calendarEventService.getCardProfile(calendarEvent);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IComments, {
    nullable: true,
    description: 'The comments for this CalendarEvent.',
  })
  @Profiling.api
  async comments(@Parent() calendarEvent: ICalendarEvent): Promise<IComments> {
    if (!calendarEvent.comments) {
      throw new EntityNotInitializedException(
        'CalendarEvent comments not defined',
        LogContext.CALENDAR
      );
    }
    return calendarEvent.comments;
  }

  @ResolveField('startDate', () => Number, {
    nullable: true,
    description: 'The start time for this CalendarEvent.',
  })
  async startDate(@Parent() event: ICalendarEvent): Promise<number> {
    const createdDate = event.startDate;
    const date = new Date(createdDate);
    return date.getTime();
  }
}
