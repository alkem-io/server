import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { spaces } from '@domain/space/space/space.schema';
import { timelines } from '@domain/timeline/timeline/timeline.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';

@Injectable()
export class TimelineResolverService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getCollaborationIdForCalendar(
    calendarID: string
  ): Promise<string> {
    const timelineID = await this.getTimelineIdForCalendar(calendarID);
    if (!timelineID) {
      return '';
    }
    const result = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.timelineId, timelineID),
    });
    if (!result) {
      this.logger.error(
        `Unable to identify Collaboration for provided Timeline ID: ${timelineID}`,
        undefined,
        LogContext.CALENDAR
      );
      return '';
    }
    return result.id;
  }

  public async getTimelineIdForCalendar(
    calendarID: string
  ): Promise<string | undefined> {
    const result = await this.db.query.timelines.findFirst({
      where: eq(timelines.calendarId, calendarID),
      with: {
        calendar: true,
      },
    });
    if (!result) {
      this.logger.error(
        `Unable to identify Timeline for provided calendar ID: ${calendarID}`,
        undefined,
        LogContext.CALENDAR
      );
      return undefined;
    }
    return result.id;
  }

  public async getSpaceIdForCalendar(
    calendarID: string
  ): Promise<string | never> {
    const collaborationID =
      await this.getCollaborationIdForCalendar(calendarID);

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaborationID),
    });

    if (space && space.id) return space.id;
    throw new EntityNotFoundException(
      `Unable to identify Space for provided calendar ID: ${calendarID}`,
      LogContext.CALENDAR
    );
  }
}
