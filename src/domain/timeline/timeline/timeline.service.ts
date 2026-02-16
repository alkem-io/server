import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq } from 'drizzle-orm';
import { ICalendar } from '../calendar/calendar.interface';
import { CalendarService } from '../calendar/calendar.service';
import { Timeline } from './timeline.entity';
import { ITimeline } from './timeline.interface';
import { timelines } from './timeline.schema';

@Injectable()
export class TimelineService {
  constructor(
    private calendarService: CalendarService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createTimeline(): ITimeline {
    const timeline: ITimeline = new Timeline();
    timeline.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TIMELINE
    );
    timeline.calendar = this.calendarService.createCalendar();

    return timeline;
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

    await this.db.delete(timelines).where(eq(timelines.id, timelineID));
    return timeline;
  }

  async getTimelineOrFail(
    timelineID: string,
    options?: { relations?: { calendar?: boolean; authorization?: boolean } }
  ): Promise<ITimeline | never> {
    const withClause: any = {};
    if (options?.relations?.calendar) withClause.calendar = true;
    if (options?.relations?.authorization) withClause.authorization = true;
    const timeline = await this.db.query.timelines.findFirst({
      where: eq(timelines.id, timelineID),
      with: Object.keys(withClause).length > 0 ? withClause : undefined,
    });
    if (!timeline)
      throw new EntityNotFoundException(
        `Timeline not found: ${timelineID}`,
        LogContext.CALENDAR
      );
    return timeline as unknown as ITimeline;
  }

  async saveTimeline(timeline: ITimeline): Promise<ITimeline> {
    if (timeline.id) {
      const [updated] = await this.db
        .update(timelines)
        .set({
          calendarId: timeline.calendar?.id,
          authorizationId: timeline.authorization?.id,
        })
        .where(eq(timelines.id, timeline.id))
        .returning();
      return updated as unknown as ITimeline;
    }
    const [inserted] = await this.db
      .insert(timelines)
      .values({
        calendarId: timeline.calendar?.id,
        authorizationId: timeline.authorization?.id,
      })
      .returning();
    return inserted as unknown as ITimeline;
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
