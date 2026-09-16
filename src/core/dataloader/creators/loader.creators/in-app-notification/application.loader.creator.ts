import { EntityNotFoundException } from '@common/exceptions';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { Application } from '@domain/access/application/application.entity';
import { IApplication } from '@domain/access/application/application.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class ApplicationLoaderCreator
  implements DataLoaderCreator<IApplication>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<IApplication | null | EntityNotFoundException> {
    return createBatchLoader(this.applicationInBatch, {
      name: this.constructor.name,
      loadedTypeName: Application.name,
      resolveToNull: options?.resolveToNull,
    });
  }

  private applicationInBatch = (
    keys: ReadonlyArray<string>
  ): Promise<Application[]> => {
    return this.manager.find(Application, {
      where: { id: In(keys) },
      relations: { roleSet: true },
    });
  };
}
