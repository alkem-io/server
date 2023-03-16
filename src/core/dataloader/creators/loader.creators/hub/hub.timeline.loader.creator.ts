import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { createTypedDataLoaderNew } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubTimelineLoaderCreator
  implements DataLoaderCreator<ITimeline[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ITimeline[]>) {
    return createTypedDataLoaderNew(
      this.manager,
      Hub,
      { timeline: true },
      this.constructor.name,
      options
    );
  }
}
