import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { Callout, ICallout } from '@domain/collaboration/callout';

@Injectable()
export class CalloutLoaderCreator implements DataLoaderCreator<ICallout> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<ICallout> {
    return createBatchLoader(
      this.constructor.name,
      Callout.name,
      this.calloutInBatch
    );
  }

  private calloutInBatch = (
    keys: ReadonlyArray<string>
  ): Promise<Callout[]> => {
    return this.manager.findBy(Callout, { id: In(keys) });
  };
}
