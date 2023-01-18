import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ICalendar } from './calendar.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CalendarEventService } from '../event/event.service';
import { ICalendarEvent } from '../event/event.interface';

@Resolver(() => ICalendar)
export class CalendarResolverFields {
  constructor(private calendarEventService: CalendarEventService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('event', () => ICalendarEvent, {
    nullable: true,
    description: 'A single CalendarEvent',
  })
  @UseGuards(GraphqlGuard)
  async event(
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the CalendarEvent',
    })
    ID: string
  ): Promise<ICalendarEvent> {
    return await this.calendarEventService.getCalendarEventOrFail(ID);
  }
}
