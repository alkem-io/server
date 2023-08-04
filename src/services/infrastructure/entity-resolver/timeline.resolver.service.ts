import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { LogContext } from '@common/enums';
import { Space } from '@domain/challenge/space/space.entity';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Collaboration } from '@domain/collaboration/collaboration';

@Injectable()
export class TimelineResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
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
    const result = await this.entityManager.findOne(Collaboration, {
      where: {
        timeline: {
          id: timelineID,
        },
      },
    });
    if (!result) {
      this.logger.error(
        `Unable to identify Collaboration for provided Timeline ID: ${timelineID}`,
        LogContext.CALENDAR
      );
      return '';
    }
    return result.id;
  }

  public async getTimelineIdForCalendar(
    calendarID: string
  ): Promise<string | undefined> {
    const result = await this.entityManager.findOne(Timeline, {
      where: {
        calendar: {
          id: calendarID,
        },
      },
      relations: {
        calendar: true,
      },
    });
    if (!result) {
      this.logger.error(
        `Unable to identify Timeline for provided calendar ID: ${calendarID}`,
        LogContext.CALENDAR
      );
      return undefined;
    }
    return result.id;
  }

  public async getSpaceIdForCalendar(
    calendarID: string
  ): Promise<string | undefined> {
    const result = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          timeline: {
            calendar: {
              id: calendarID,
            },
          },
        },
      },
    });
    if (!result) {
      this.logger.error(
        `Unable to identify Space for provided calendar ID: ${calendarID}`,
        LogContext.CALENDAR
      );
      return undefined;
    }
    return result.id;
  }
}
