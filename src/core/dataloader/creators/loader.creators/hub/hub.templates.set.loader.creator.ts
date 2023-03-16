import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { ITemplatesSet } from '@domain/template/templates-set';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubTemplatesSetLoaderCreator
  implements DataLoaderCreator<ITemplatesSet[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ITemplatesSet[]>) {
    return createTypedDataLoader(
      this.manager,
      Hub,
      { templatesSet: true },
      this.constructor.name,
      options
    );
  }
}
