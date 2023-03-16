import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { DataLoaderInitError } from '@common/exceptions/data-loader';

@Injectable()
export class JourneyCollaborationLoaderCreator
  implements DataLoaderCreator<ICollaboration>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICollaboration>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `The ${this.constructor.name} loader creator requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedDataLoader(
      this.manager,
      options.parentClassRef,
      { collaboration: true },
      this.constructor.name,
      options
    );
  }
}
