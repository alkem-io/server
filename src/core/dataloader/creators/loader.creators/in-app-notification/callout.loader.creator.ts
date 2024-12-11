import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class CalloutLoaderCreator implements DataLoaderCreator<ICallout> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<ICallout | null | EntityNotFoundException> {
    return createBatchLoader(this.calloutInBatch, {
      name: this.constructor.name,
      loadedTypeName: Callout.name,
      resolveToNull: options?.resolveToNull,
    });
  }

  private calloutInBatch = (
    keys: ReadonlyArray<string>
  ): Promise<Callout[]> => {
    return this.manager.findBy(Callout, { id: In(keys) });
  };
}
