import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Inject, Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';

@Injectable()
export class CalloutLoaderCreator implements DataLoaderCreator<ICallout> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<ICallout | null | EntityNotFoundException> {
    return createBatchLoader(this.calloutInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'Callout',
      resolveToNull: options?.resolveToNull,
    });
  }

  private calloutInBatch = async (
    keys: ReadonlyArray<string>
  ): Promise<ICallout[]> => {
    return this.db.query.callouts.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
    }) as unknown as Promise<ICallout[]>;
  };
}
