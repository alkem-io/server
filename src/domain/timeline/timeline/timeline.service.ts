import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ICalendar } from '../calendar/calendar.interface';
import { CalendarService } from '../calendar/calendar.service';
import { Timeline } from './timeline.entity';
import { ITimeline } from './timeline.interface';

@Injectable()
export class TimelineService {
  constructor(
    private calendarService: CalendarService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Timeline)
    private timelineRepository: Repository<Timeline>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createTimeline(): Promise<ITimeline> {
    const timeline: ITimeline = new Timeline();
    timeline.authorization = new AuthorizationPolicy();
    timeline.calendar = await this.calendarService.createCalendar();

    return await this.timelineRepository.save(timeline);
  }

  async deleteTimeline(timelineID: string): Promise<ITimeline> {
    const timeline = await this.getTimelineOrFail(timelineID, {
      relations: { calendar: true },
    });

    if (timeline.authorization)
      await this.authorizationPolicyService.delete(timeline.authorization);

    if (timeline.calendar) {
      await this.calendarService.deleteCalendar(timeline.calendar.id);
    }

    return await this.timelineRepository.remove(timeline as Timeline);
  }

  async getTimelineOrFail(
    timelineID: string,
    options?: FindOneOptions<Timeline>
  ): Promise<ITimeline | never> {
    const timeline = await this.timelineRepository.findOne({
      where: { id: timelineID },
      ...options,
    });
    if (!timeline)
      throw new EntityNotFoundException(
        `Timeline not found: ${timelineID}`,
        LogContext.CALENDAR
      );
    return timeline;
  }

  async saveTimeline(timeline: ITimeline): Promise<ITimeline> {
    return await this.timelineRepository.save(timeline);
  }

  async getCalendarOrFail(timelineInput: ITimeline): Promise<ICalendar> {
    const timeline = await this.getTimelineOrFail(timelineInput.id, {
      relations: { calendar: true },
    });
    const calendar = timeline.calendar;
    if (!calendar) {
      throw new EntityNotFoundException(
        `No calendar found on timeline: ${timelineInput.id}`,
        LogContext.CALENDAR
      );
    }
    return calendar;
  }
}
