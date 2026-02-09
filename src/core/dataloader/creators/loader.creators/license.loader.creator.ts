import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { License } from '@domain/common/license/license.entity';
import { ILicense } from '@domain/common/license/license.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class LicenseLoaderCreator implements DataLoaderCreator<ILicense> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      ILicense,
      { id: string; license?: License }
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
      {
        license: true,
      },
      this.constructor.name,
      options
    );
  }
}
