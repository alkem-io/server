import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ILifecycle } from '@domain/common/lifecycle';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { InnovationFlow } from '@domain/challenge/innovation-flow/innovation.flow.entity';

@Injectable()
export class InnovationFlowLifecycleLoaderCreator
  implements DataLoaderCreator<ILifecycle>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILifecycle, InnovationFlow>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      { lifecycle: true },
      this.constructor.name,
      options
    );
  }
}
