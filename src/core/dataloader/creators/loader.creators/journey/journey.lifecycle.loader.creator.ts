import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ILifecycle } from '@domain/common/lifecycle';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class JourneyLifecycleLoaderCreator
  implements DataLoaderCreator<ILifecycle>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILifecycle, BaseChallenge>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `The ${this.constructor.name} loader creator requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedDataLoader(
      this.manager,
      options.parentClassRef,
      { lifecycle: true },
      this.constructor.name,
      options
    );
  }
}
