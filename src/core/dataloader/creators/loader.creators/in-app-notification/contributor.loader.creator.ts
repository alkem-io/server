import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { IContributorBase } from '@domain/community/contributor';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ContributorLoaderCreator
  implements DataLoaderCreator<IContributorBase>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<IContributor | null | EntityNotFoundException> {
    return createBatchLoader(this.contributorsInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'Contributor',
      resolveToNull: options?.resolveToNull,
    });
  }

  private contributorsInBatch = async (
    keys: ReadonlyArray<string>
  ): Promise<IContributor[]> => {
    const contributors: IContributor[] = [];

    let result: IContributor[] = await this.db.query.users.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
    }) as unknown as IContributor[];
    contributors.push(...result);

    if (contributors.length !== keys.length) {
      result = await this.db.query.organizations.findMany({
        where: (table, { inArray }) => inArray(table.id, [...keys]),
      }) as unknown as IContributor[];
      contributors.push(...result);
    }
    if (contributors.length !== keys.length) {
      result = await this.db.query.virtualContributors.findMany({
        where: (table, { inArray }) => inArray(table.id, [...keys]),
      }) as unknown as IContributor[];
      contributors.push(...result);
    }

    return contributors;
  };
}
