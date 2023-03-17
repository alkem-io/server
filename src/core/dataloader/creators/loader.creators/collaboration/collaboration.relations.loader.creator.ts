import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IRelation } from '@domain/collaboration/relation';
import { Collaboration } from '@domain/collaboration/collaboration';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CollaborationRelationsLoaderCreator
  implements DataLoaderCreator<IRelation[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IRelation[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Collaboration,
      {
        relations: true,
      },
      this.constructor.name,
      options
    );
  }
}
