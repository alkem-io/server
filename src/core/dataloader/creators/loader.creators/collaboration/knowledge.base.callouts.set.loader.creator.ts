import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class KnowledgeBaseCalloutsSetLoaderCreator
  implements DataLoaderCreator<ICalloutsSet[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<ICalloutsSet[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      KnowledgeBase,
      { calloutsSet: true },
      this.constructor.name,
      options
    );
  }
}
