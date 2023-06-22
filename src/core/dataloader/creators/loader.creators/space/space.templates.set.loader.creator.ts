import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { ITemplatesSet } from '@domain/template/templates-set';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class SpaceTemplatesSetLoaderCreator
  implements DataLoaderCreator<ITemplatesSet[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ITemplatesSet[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Space,
      { templatesSet: true },
      this.constructor.name,
      options
    );
  }
}
