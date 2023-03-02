import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { Profiling } from '@common/decorators/profiling.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { IUser } from '@domain/community';
import { UserService } from '@domain/community/user/user.service';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';

@Resolver(() => ICalendarEvent)
export class CalendarEventResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calendarEventService: CalendarEventService,
    private userService: UserService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this CalendarEvent',
  })
  async createdBy(
    @Parent() calendarEvent: ICalendarEvent
  ): Promise<IUser | null> {
    const createdBy = calendarEvent.createdBy;
    if (!createdBy) {
      return null;
    }

    try {
      return await this.userService.getUserOrFail(createdBy);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving calendar event '${calendarEvent.id}'`,
          LogContext.CALENDAR
        );
        return null;
      } else {
        throw e;
      }
    }
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: true,
    description: 'The Profile for this Card.',
  })
  @Profiling.api
  async profile(@Parent() calendarEvent: ICalendarEvent): Promise<IProfile> {
    return await this.calendarEventService.getProfile(calendarEvent);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IComments, {
    nullable: true,
    description: 'The comments for this CalendarEvent.',
  })
  @Profiling.api
  async comments(@Parent() calendarEvent: ICalendarEvent): Promise<IComments> {
    return this.calendarEventService.getComments(calendarEvent.id);
  }

  @ResolveField('startDate', () => Date, {
    nullable: true,
    description: 'The start time for this CalendarEvent.',
  })
  startDate(@Parent() event: ICalendarEvent): Date {
    return event.startDate;
  }
}
