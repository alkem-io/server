import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedSimpleDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class OrganizationLoaderCreator
  implements DataLoaderCreator<IOrganization>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IOrganization>) {
    return createTypedSimpleDataLoader(
      this.db,
      'organizations',
      this.constructor.name,
      options
    );
  }
}
