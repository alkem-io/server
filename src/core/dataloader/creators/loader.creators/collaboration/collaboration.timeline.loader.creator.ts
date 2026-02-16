import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CollaborationTimelineLoaderCreator
  implements DataLoaderCreator<ITimeline[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ITimeline[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'collaborations',
      { timeline: true },
      this.constructor.name,
      options
    );
  }
}
