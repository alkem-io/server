import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IAgent } from '@src/domain';
import { createTypedDataLoaderNew } from '@core/dataloader/utils';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class JourneyAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoaderNew(
      this.manager,
      options.parentClassRef,
      { agent: true },
      this.constructor.name,
      options
    );
  }
}
