import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountVirtualContributorsLoaderCreator
  implements DataLoaderCreator<IVirtualContributor[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IVirtualContributor[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'accounts',
      { virtualContributors: true },
      this.constructor.name,
      options
    );
  }
}
