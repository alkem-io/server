import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalendar } from '../calendar/calendar.interface';
import { ITimeline } from './timeline.interface';
import { TimelineService } from './timeline.service';

@Resolver(() => ITimeline)
export class TimelineResolverFields {
  constructor(private timelineService: TimelineService) {}

  @ResolveField('calendar', () => ICalendar, {
    nullable: false,
    description: 'The Innovation Library for the timeline',
  })
  async calendar(@Parent() timeline: ITimeline): Promise<ICalendar> {
    const result = await this.timelineService.getCalendarOrFail(timeline);
    return result;
  }
}
