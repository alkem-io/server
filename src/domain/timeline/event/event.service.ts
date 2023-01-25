import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteCalendarEventInput } from './dto/event.dto.delete';
import { UpdateCalendarEventInput } from './dto/event.dto.update';
import { VisualService } from '@domain/common/visual/visual.service';
import { CommentsService } from '@domain/communication/comments/comments.service';
import { CreateCalendarEventInput } from './dto/event.dto.create';
import { CardProfileService } from '@domain/collaboration/card-profile/card.profile.service';
import { ICardProfile } from '@domain/collaboration/card-profile/card.profile.interface';
import { CalendarEvent } from './event.entity';
import { ICalendarEvent } from './event.interface';

@Injectable()
export class CalendarEventService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService,
    private commentsService: CommentsService,
    private cardProfileService: CardProfileService,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createCalendarEvent(
    calendarEventInput: CreateCalendarEventInput,
    userID: string,
    communicationGroupID: string
  ): Promise<CalendarEvent> {
    const calendarEvent: ICalendarEvent =
      CalendarEvent.create(calendarEventInput);
    calendarEvent.profile = await this.cardProfileService.createCardProfile(
      calendarEventInput.profileData
    );
    calendarEvent.authorization = new AuthorizationPolicy();
    calendarEvent.createdBy = userID;

    calendarEvent.comments = await this.commentsService.createComments(
      communicationGroupID,
      `calendarEvent-comments-${calendarEvent.displayName}`
    );

    return await this.calendarEventRepository.save(calendarEvent);
  }

  public async deleteCalendarEvent(
    deleteData: DeleteCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEventID = deleteData.ID;
    const calendarEvent = await this.getCalendarEventOrFail(calendarEventID, {
      relations: ['profile', 'comments'],
    });
    if (calendarEvent.authorization) {
      await this.authorizationPolicyService.delete(calendarEvent.authorization);
    }
    if (calendarEvent.profile) {
      await this.cardProfileService.deleteCardProfile(calendarEvent.profile.id);
    }
    if (calendarEvent.comments) {
      await this.commentsService.deleteComments(calendarEvent.comments);
    }

    const result = await this.calendarEventRepository.remove(
      calendarEvent as CalendarEvent
    );
    result.id = calendarEventID;
    return result;
  }

  public async getCalendarEventOrFail(
    calendarEventID: string,
    options?: FindOneOptions<CalendarEvent>
  ): Promise<ICalendarEvent> {
    const calendarEvent = await this.calendarEventRepository.findOne(
      { id: calendarEventID },
      options
    );
    if (!calendarEvent)
      throw new EntityNotFoundException(
        `Not able to locate calendarEvent with the specified ID: ${calendarEventID}`,
        LogContext.CALENDAR
      );
    return calendarEvent;
  }

  public async updateCalendarEvent(
    calendarEventData: UpdateCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEvent = await this.getCalendarEventOrFail(
      calendarEventData.ID,
      {
        relations: ['profile'],
      }
    );

    // Copy over the received data
    if (calendarEventData.displayName) {
      calendarEvent.displayName = calendarEventData.displayName;
    }
    if (calendarEventData.profileData) {
      if (!calendarEvent.profile) {
        throw new EntityNotFoundException(
          `CalendarEvent not initialised: ${calendarEvent.id}`,
          LogContext.CALENDAR
        );
      }
      calendarEvent.profile = await this.cardProfileService.updateCardProfile(
        calendarEvent.profile,
        calendarEventData.profileData
      );
    }
    if (calendarEventData.durationDays) {
      calendarEvent.durationDays = calendarEventData.durationDays;
    }
    if (calendarEventData.durationMinutes) {
      calendarEvent.durationMinutes = calendarEventData.durationMinutes;
    }
    calendarEvent.wholeDay = calendarEventData.wholeDay;
    calendarEvent.multipleDays = calendarEventData.multipleDays;
    calendarEvent.startDate = calendarEventData.startDate;

    if (calendarEventData.type) {
      calendarEvent.type = calendarEventData.type;
    }

    await this.calendarEventRepository.save(calendarEvent);

    return calendarEvent;
  }

  public async saveCalendarEvent(
    calendarEvent: ICalendarEvent
  ): Promise<ICalendarEvent> {
    return await this.calendarEventRepository.save(calendarEvent);
  }

  public async getCardProfile(
    calendarEvent: ICalendarEvent
  ): Promise<ICardProfile> {
    const calendarEventLoaded = await this.getCalendarEventOrFail(
      calendarEvent.id,
      {
        relations: ['profile'],
      }
    );
    if (!calendarEventLoaded.profile)
      throw new EntityNotFoundException(
        `Card profile not initialised for calendarEvent: ${calendarEvent.id}`,
        LogContext.CALENDAR
      );

    return calendarEventLoaded.profile;
  }

  public async getComments(calendarEventID: string) {
    const { commentsId } = await this.calendarEventRepository
      .createQueryBuilder('calendarEvent')
      .select('calendarEvent.commentsId', 'commentsId')
      .where({ id: calendarEventID })
      .getRawOne();

    if (!commentsId) {
      throw new EntityNotFoundException(
        `Comments not found on calendarEvent: ${calendarEventID}`,
        LogContext.CALENDAR
      );
    }

    return this.commentsService.getCommentsOrFail(commentsId);
  }

  public async getCalendarEventsInCalloutCount(calloutId: string) {
    return this.calendarEventRepository.count({
      where: { callout: { id: calloutId } },
    });
  }

  public async getCardsInCalloutCount(calloutID: string): Promise<number> {
    const count = await this.calendarEventRepository.count({
      where: { callout: calloutID },
    });
    return count;
  }
}
