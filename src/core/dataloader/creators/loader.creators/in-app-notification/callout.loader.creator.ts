import { EntityNotFoundException } from '@common/exceptions';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

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
