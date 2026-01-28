import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { DeleteCalendarEventInput } from './dto/event.dto.delete';
import { UpdateCalendarEventInput } from './dto/event.dto.update';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';

@InstrumentResolver()
@Resolver()
export class CalendarEventResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calendarEventService: CalendarEventService
  ) {}

  @Mutation(() => ICalendarEvent, {
    description: 'Deletes the specified CalendarEvent.',
  })
  async deleteCalendarEvent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(deleteData.ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendarEvent.authorization,
      AuthorizationPrivilege.DELETE,
      `delete calendarEvent: ${calendarEvent.id}`
    );
    return this.calendarEventService.deleteCalendarEvent(deleteData);
  }

  @Mutation(() => ICalendarEvent, {
    description: 'Updates the specified CalendarEvent.',
  })
  async updateCalendarEvent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('eventData') eventData: UpdateCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(eventData.ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendarEvent.authorization,
      AuthorizationPrivilege.UPDATE,
      `update calendarEvent: ${calendarEvent.id}`
    );
    return this.calendarEventService.updateCalendarEvent(eventData);
  }
}
