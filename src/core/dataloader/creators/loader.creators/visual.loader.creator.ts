import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { IVisual } from '@domain/common/visual';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class VisualLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IVisual,
      { id: string; visual?: IVisual }
    >
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      { visual: true },
      this.constructor.name,
      options
    );
  }
}
