import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Collaboration } from '@domain/collaboration/collaboration';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';

@Injectable()
export class CollaborationCalloutsSetLoaderCreator
  implements DataLoaderCreator<ITimeline[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICalloutsSet[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Collaboration,
      { calloutsSet: true },
      this.constructor.name,
      options
    );
  }
}
