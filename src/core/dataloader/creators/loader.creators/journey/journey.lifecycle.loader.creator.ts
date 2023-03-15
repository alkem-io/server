import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { ILifecycle } from '@domain/common/lifecycle';
import { createTypedDataLoaderNew, findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { DataLoaderInitError } from '@common/exceptions/data-loader';

@Injectable()
export class JourneyLifecycleLoaderCreator
  implements DataLoaderCreator<ILifecycle>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILifecycle>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoaderNew(
      this.manager,
      options.parentClassRef,
      { lifecycle: true },
      this.constructor.name,
      options
    );
  }
}
