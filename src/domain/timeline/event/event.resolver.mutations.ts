import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CalendarEventService } from './event.service';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { ICalendarEvent } from './event.interface';
import { DeleteCalendarEventInput } from './dto/event.dto.delete';
import { UpdateCalendarEventInput } from './dto/event.dto.update';

@Resolver()
export class CalendarEventResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calendarEventService: CalendarEventService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalendarEvent, {
    description: 'Deletes the specified CalendarEvent.',
  })
  async deleteCalendarEvent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendarEvent.authorization,
      AuthorizationPrivilege.DELETE,
      `delete calendarEvent: ${calendarEvent.displayName}`
    );
    return await this.calendarEventService.deleteCalendarEvent(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalendarEvent, {
    description: 'Updates the specified CalendarEvent.',
  })
  async updateCalendarEvent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('eventData') eventData: UpdateCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(eventData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendarEvent.authorization,
      AuthorizationPrivilege.UPDATE,
      `update calendarEvent: ${calendarEvent.nameID}`
    );
    return await this.calendarEventService.updateCalendarEvent(eventData);
  }
}
