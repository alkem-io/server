import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountInnovationHubsLoaderCreator
  implements DataLoaderCreator<IInnovationHub[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IInnovationHub[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'accounts',
      { innovationHubs: true },
      this.constructor.name,
      options
    );
  }
}
