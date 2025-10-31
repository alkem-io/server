import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { CalendarEvent } from '@domain/timeline/event/event.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';

@Injectable()
export class CalendarEventLoaderCreator
  implements DataLoaderCreator<ICalendarEvent>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<ICalendarEvent | null | EntityNotFoundException> {
    return createBatchLoader(this.calendarEventInBatch, {
      name: this.constructor.name,
      loadedTypeName: CalendarEvent.name,
      resolveToNull: options?.resolveToNull,
    });
  }

  private calendarEventInBatch = (
    keys: ReadonlyArray<string>
  ): Promise<CalendarEvent[]> => {
    return this.manager.findBy(CalendarEvent, { id: In(keys) });
  };
}
