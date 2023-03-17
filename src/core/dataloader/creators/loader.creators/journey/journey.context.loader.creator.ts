import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IContext } from '@src/domain';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class JourneyContextLoaderCreator
  implements DataLoaderCreator<IContext>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IContext>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      { context: true },
      this.constructor.name,
      options
    );
  }
}
