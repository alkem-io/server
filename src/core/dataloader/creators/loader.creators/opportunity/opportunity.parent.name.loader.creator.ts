import { EntityManager, FindOptionsSelect } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { Opportunity } from '@domain/collaboration/opportunity';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class OpportunityParentNameLoaderCreator
  implements DataLoaderCreator<string>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<string, Opportunity>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoader(
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
      }
    );
  }
}
