import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Collaboration } from '@domain/collaboration/collaboration';

@Injectable()
export class CollaborationTimelineLoaderCreator
  implements DataLoaderCreator<ITimeline[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ITimeline[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Collaboration,
      { timeline: true },
      this.constructor.name,
      options
    );
  }
}
