import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class SpaceTimelineLoaderCreator
  implements DataLoaderCreator<ITimeline[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ITimeline[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Space,
      { timeline: true },
      this.constructor.name,
      options
    );
  }
}
