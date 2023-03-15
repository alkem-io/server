import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { createTypedDataLoader, createTypedDataLoaderNew } from '../../../utils';
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
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoaderNew(
      this.manager,
      options.parentClassRef,
      { collaboration: true },
      this.constructor.name,
      options
    );
  }
}
