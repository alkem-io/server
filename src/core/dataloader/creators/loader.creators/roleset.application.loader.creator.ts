import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedSimpleDataLoader } from '@core/dataloader/utils';
import { DataLoaderCreator } from '../base/data.loader.creator';
import { Application, IApplication } from '@domain/access/application';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators';

@Injectable()
export class RoleSetApplicationLoaderCreator
  implements DataLoaderCreator<IApplication>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IApplication>) {
    return createTypedSimpleDataLoader(
      this.manager,
      Application,
      this.constructor.name,
      options
    );
  }
}
