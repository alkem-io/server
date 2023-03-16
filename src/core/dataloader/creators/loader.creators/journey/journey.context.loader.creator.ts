import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IContext } from '@src/domain';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class JourneyContextLoaderCreator
  implements DataLoaderCreator<IContext>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IContext>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `The ${this.constructor.name} loader creator requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedDataLoader(
      this.manager,
      options.parentClassRef,
      { context: true },
      this.constructor.name,
      options
    );
  }
}
