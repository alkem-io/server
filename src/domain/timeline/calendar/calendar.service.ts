import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventService } from '../event/event.service';
import { Calendar } from './calendar.entity';
import { ICalendar } from './calendar.interface';
import { CalendarArgsEvents } from './dto/calendar.args.events';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';

@Injectable()
export class CalendarService {
  constructor(
    private calendarEventService: CalendarEventService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private namingService: NamingService,
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createCalendar(): Promise<ICalendar> {
    const calendar: ICalendar = new Calendar();
    calendar.authorization = new AuthorizationPolicy();
    calendar.events = [];

    return await this.calendarRepository.save(calendar);
  }

  async deleteCalendar(calendarID: string): Promise<ICalendar> {
    const calendar = await this.getCalendarOrFail(calendarID, {
      relations: ['events'],
    });

    if (calendar.authorization)
      await this.authorizationPolicyService.delete(calendar.authorization);

    if (calendar.events) {
      for (const event of calendar.events) {
        await this.calendarEventService.deleteCalendarEvent({
          ID: event.id,
        });
      }
    }

    return await this.calendarRepository.remove(calendar as Calendar);
  }

  async getCalendarOrFail(
    calendarID: string,
    options?: FindOneOptions<Calendar>
  ): Promise<ICalendar> {
    const calendar = await this.calendarRepository.findOne(
      { id: calendarID },
      options
    );
    if (!calendar)
      throw new EntityNotFoundException(
        `Calendar not found: ${calendarID}`,
        LogContext.CALENDAR
      );
    return calendar;
  }

  public async getCalendarEvents(
    calendar: ICalendar
  ): Promise<ICalendarEvent[]> {
    const events = calendar.events;
    if (!events)
      throw new EntityNotFoundException(
        `Undefined calendar events found: ${calendar.id}`,
        LogContext.CALENDAR
      );

    return events;
  }

  public async createCalendarEvent(
    calendarEventData: CreateCalendarEventOnCalendarInput,
    userID: string
  ): Promise<ICalendarEvent> {
    const calendar = await this.getCalendarOrFail(calendarEventData.calendarID);
    if (!calendar.events)
      throw new EntityNotInitializedException(
        `Calendar (${calendar}) not initialised`,
        LogContext.CALENDAR
      );

    if (calendarEventData.nameID && calendarEventData.nameID.length > 0) {
      const nameAvailable = true; //await this.namingService.isNameIdAvailable(calendarEventData.nameID);
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create CalendarEvent: the provided nameID is already taken: ${calendarEventData.nameID}`,
          LogContext.CALENDAR
        );
    } else {
      calendarEventData.nameID = this.namingService.createNameID(
        `${calendarEventData.displayName}`
      );
    }
    const communicationGroupID = '';

    const calendarEvent = await this.calendarEventService.createCalendarEvent(
      calendarEventData,
      userID,
      communicationGroupID
    );
    calendar.events.push(calendarEvent);
    await this.calendarRepository.save(calendar);

    return calendarEvent;
  }

  public async getCommunityPolicy(
    collaborationID: string
  ): Promise<ICommunityPolicy> {
    return await this.namingService.getCommunityPolicyForCollaboration(
      collaborationID
    );
  }

  public async getCalendarEventsArgs(
    calendar: ICalendar,
    args: CalendarArgsEvents,
    agentInfo: AgentInfo
  ): Promise<ICalendarEvent[]> {
    const calendarLoaded = await this.getCalendarOrFail(calendar.id, {
      relations: ['events'],
    });
    const allEvents = calendarLoaded.events;
    if (!allEvents)
      throw new EntityNotFoundException(
        `Calendar not initialised, no events: ${calendar.id}`,
        LogContext.CALENDAR
      );

    // First filter the callouts the current user has READ privilege to
    const readableCallouts = allEvents.filter(callout =>
      this.hasAgentAccessToCallout(callout, agentInfo)
    );

    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: ICalendarEvent[] = [];
      for (const eventID of args.IDs) {
        const event = readableCallouts.find(e => e.id === eventID);

        if (!event)
          throw new EntityNotFoundException(
            `Event with requested ID (${eventID}) not located within current Calendar: ${calendar.id}`,
            LogContext.CALENDAR
          );
        results.push(event);
      }
      return results;
    }

    // (b) limit number of results
    if (args.limit) {
      return limitAndShuffle(readableCallouts, args.limit, false);
    }

    return readableCallouts;
  }

  private hasAgentAccessToCallout(
    event: ICalendarEvent,
    agentInfo: AgentInfo
  ): boolean {
    return this.authorizationService.isAccessGranted(
      agentInfo,
      event.authorization,
      AuthorizationPrivilege.READ
    );
  }
}
