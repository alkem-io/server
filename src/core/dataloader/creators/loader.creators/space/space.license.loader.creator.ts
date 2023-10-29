import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { ILicense } from '@domain/license/license/license.interface';

@Injectable()
export class SpaceLicenseLoaderCreator
  implements DataLoaderCreator<ILicense[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILicense[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Space,
      { license: true },
      this.constructor.name,
      options
    );
  }
}
