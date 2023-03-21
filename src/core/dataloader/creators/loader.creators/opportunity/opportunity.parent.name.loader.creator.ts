import { EntityManager, FindOptionsSelect } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Opportunity } from '@domain/collaboration/opportunity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class OpportunityParentNameLoaderCreator
  implements DataLoaderCreator<string>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<string, Opportunity>) {
    return createTypedRelationDataLoader(
      this.manager,
      Opportunity,
      { challenge: true },
      this.constructor.name,
      {
        ...options,
        fields: {
          challenge: {
            nameID: true,
          },
        } as FindOptionsSelect<Opportunity>,
        getResult: r => r?.challenge?.nameID,
      }
    );
  }
}
