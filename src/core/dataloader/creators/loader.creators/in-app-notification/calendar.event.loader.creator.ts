import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CalendarEventLoaderCreator
  implements DataLoaderCreator<ICalendarEvent>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<ICalendarEvent | null | EntityNotFoundException> {
    return createBatchLoader(this.calendarEventInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'CalendarEvent',
      resolveToNull: options?.resolveToNull,
    });
  }

  private calendarEventInBatch = async (
    keys: ReadonlyArray<string>
  ): Promise<ICalendarEvent[]> => {
    return this.db.query.calendarEvents.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
    }) as unknown as Promise<ICalendarEvent[]>;
  };
}
