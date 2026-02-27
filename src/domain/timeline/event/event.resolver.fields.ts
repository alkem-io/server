import { Profiling } from '@common/decorators/profiling.decorator';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CalendarEventCalendarData,
  CalendarUrls,
  calculateCalendarEventEndDate,
  formatLocation,
  generateCalendarUrls,
  toIsoString,
  validateCalendarDateRange,
} from './calendar.event.calendar-links';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';

@Resolver(() => ICalendarEvent)
export class CalendarEventResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calendarEventService: CalendarEventService,
    private userLookupService: UserLookupService,
    private urlGeneratorService: UrlGeneratorService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {}

  private calendarUrlCache = new WeakMap<
    ICalendarEvent,
    Promise<CalendarUrls>
  >();

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
      return await this.userLookupService.getUserById(createdBy);
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

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Post.',
  })
  @Profiling.api
  async profile(@Parent() calendarEvent: ICalendarEvent): Promise<IProfile> {
    return await this.calendarEventService.getProfileOrFail(calendarEvent);
  }

  @ResolveField('startDate', () => Date, {
    nullable: true,
    description: 'The start time for this CalendarEvent.',
  })
  startDate(@Parent() event: ICalendarEvent): Date {
    return event.startDate;
  }

  @ResolveField('subspace', () => ISpace, {
    nullable: true,
    description:
      'The subspace associated with this CalendarEvent. Only applicable if the event is not part of this Space calendar',
  })
  subspace(@Parent() event: ICalendarEvent): Promise<ISpace | undefined> {
    return this.calendarEventService.getSubspace(event);
  }

  @ResolveField('googleCalendarUrl', () => String, {
    nullable: true,
    description: 'Google Calendar add-event URL for this CalendarEvent.',
  })
  async googleCalendarUrl(@Parent() event: ICalendarEvent): Promise<string> {
    const urls = await this.getCalendarUrls(event);
    return urls.googleCalendarUrl;
  }

  @ResolveField('outlookCalendarUrl', () => String, {
    nullable: true,
    description: 'Outlook Calendar add-event URL for this CalendarEvent.',
  })
  async outlookCalendarUrl(@Parent() event: ICalendarEvent): Promise<string> {
    const urls = await this.getCalendarUrls(event);
    return urls.outlookCalendarUrl;
  }

  @ResolveField('appleCalendarUrl', () => String, {
    nullable: true,
    description: 'Apple Calendar data URL for this CalendarEvent.',
  })
  async appleCalendarUrl(@Parent() event: ICalendarEvent): Promise<string> {
    const urls = await this.getCalendarUrls(event);
    return urls.appleCalendarUrl;
  }

  @ResolveField('icsDownloadUrl', () => String, {
    nullable: true,
    description: 'ICS file download data URL for this CalendarEvent.',
  })
  async icsDownloadUrl(@Parent() event: ICalendarEvent): Promise<string> {
    const urls = await this.getCalendarUrls(event);
    return urls.icsDownloadUrl;
  }

  private async getCalendarUrls(event: ICalendarEvent): Promise<CalendarUrls> {
    const cached = this.calendarUrlCache.get(event);
    if (cached) {
      return cached;
    }

    const generated = this.buildCalendarUrls(event);
    this.calendarUrlCache.set(event, generated);
    return generated;
  }

  private async buildCalendarUrls(
    event: ICalendarEvent
  ): Promise<CalendarUrls> {
    const calendarEventUrl =
      await this.urlGeneratorService.getCalendarEventUrlPath(event.id);
    const startDateIso = toIsoString(event.startDate, 'startDate');
    const endDateIso = toIsoString(
      calculateCalendarEventEndDate(event).toISOString(),
      'endDate'
    );

    validateCalendarDateRange(startDateIso, endDateIso, event.id);

    const profile = await this.calendarEventService.getProfileOrFail(event);
    const description = profile?.description ?? undefined;
    const location = formatLocation(profile?.location);

    const calendarEventData: CalendarEventCalendarData = {
      id: event.id,
      title: profile.displayName,
      url: calendarEventUrl,
      startDate: startDateIso,
      endDate: endDateIso,
      wholeDay: event.wholeDay,
      description,
      location,
    };

    const icsRestUrl = this.urlGeneratorService.getCalendarEventIcsRestUrl(
      event.id
    );

    return generateCalendarUrls(calendarEventData, icsRestUrl);
  }
}
