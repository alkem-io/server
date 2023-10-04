import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteCalendarEventInput } from './dto/event.dto.delete';
import { UpdateCalendarEventInput } from './dto/event.dto.update';
import { CreateCalendarEventInput } from './dto/event.dto.create';
import { CalendarEvent } from './event.entity';
import { ICalendarEvent } from './event.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomType } from '@common/enums/room.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@Injectable()
export class CalendarEventService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private profileService: ProfileService,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createCalendarEvent(
    calendarEventInput: CreateCalendarEventInput,
    parentStorageBucket: IStorageBucket,
    userID: string
  ): Promise<CalendarEvent> {
    const calendarEvent: ICalendarEvent =
      CalendarEvent.create(calendarEventInput);
    calendarEvent.profile = await this.profileService.createProfile(
      calendarEventInput.profileData,
      ProfileType.CALENDAR_EVENT,
      parentStorageBucket
    );
    await this.profileService.addTagsetOnProfile(calendarEvent.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: calendarEventInput.tags || [],
    });
    calendarEvent.authorization = new AuthorizationPolicy();
    calendarEvent.createdBy = userID;

    calendarEvent.comments = await this.roomService.createRoom(
      `calendarEvent-comments-${calendarEvent.nameID}`,
      RoomType.CALENDAR_EVENT
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
      await this.profileService.deleteProfile(calendarEvent.profile.id);
    }
    if (calendarEvent.comments) {
      await this.roomService.deleteRoom(calendarEvent.comments);
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
  ): Promise<ICalendarEvent | never> {
    const calendarEvent = await this.calendarEventRepository.findOne({
      where: { id: calendarEventID },
      ...options,
    });
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
    if (calendarEventData.profileData) {
      if (!calendarEvent.profile) {
        throw new EntityNotFoundException(
          `CalendarEvent not initialised: ${calendarEvent.id}`,
          LogContext.CALENDAR
        );
      }
      calendarEvent.profile = await this.profileService.updateProfile(
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

  public async getProfile(calendarEvent: ICalendarEvent): Promise<IProfile> {
    const calendarEventLoaded = await this.getCalendarEventOrFail(
      calendarEvent.id,
      {
        relations: ['profile'],
      }
    );
    if (!calendarEventLoaded.profile)
      throw new EntityNotFoundException(
        `Post profile not initialised for calendarEvent: ${calendarEvent.id}`,
        LogContext.CALENDAR
      );

    return calendarEventLoaded.profile;
  }

  public async getComments(calendarEventID: string) {
    const calendarEventLoaded = await this.getCalendarEventOrFail(
      calendarEventID,
      {
        relations: ['comments'],
      }
    );

    if (!calendarEventLoaded.comments) {
      throw new EntityNotFoundException(
        `Comments not found on calendarEvent: ${calendarEventID}`,
        LogContext.CALENDAR
      );
    }

    return calendarEventLoaded.comments;
  }
}
