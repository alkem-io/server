import { Collaboration } from '@domain/collaboration/collaboration';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CollaborationTimelineLoaderCreator
  implements DataLoaderCreator<ITimeline[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<ITimeline[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Collaboration,
      { timeline: true },
      this.constructor.name,
      options
    );
  }
}
