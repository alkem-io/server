import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedSimpleDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { Application, IApplication } from '@domain/access/application';

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
