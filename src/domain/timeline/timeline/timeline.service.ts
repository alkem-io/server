import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ICalendar } from '../calendar/calendar.interface';
import { Timeline } from './timeline.entity';
import { ITimeline } from './timeline.interface';

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(Timeline)
    private timelineRepository: Repository<Timeline>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getTimelineOrFail(
    timelineID: string,
    options?: FindOneOptions<Timeline>
  ): Promise<ITimeline> {
    const timeline = await this.timelineRepository.findOne(
      { id: timelineID },
      options
    );
    if (!timeline)
      throw new EntityNotFoundException(
        `Timeline not found: ${timelineID}`,
        LogContext.PLATFORM
      );
    return timeline;
  }

  async saveTimeline(timeline: ITimeline): Promise<ITimeline> {
    return await this.timelineRepository.save(timeline);
  }

  async getCalendarOrFail(timelineInput: ITimeline): Promise<ICalendar> {
    const timeline = await this.getTimelineOrFail(timelineInput.id, {
      relations: ['calendar'],
    });
    const calendar = timeline.calendar;
    if (!calendar) {
      throw new EntityNotFoundException(
        'No Timeline Library found!',
        LogContext.PLATFORM
      );
    }
    return calendar;
  }
}
