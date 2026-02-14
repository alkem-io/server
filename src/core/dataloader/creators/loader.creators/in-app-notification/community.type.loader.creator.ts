import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CommunityTypeLoaderCreator
  implements DataLoaderCreator<{ id: string; type: RoleSetContributorType }>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options?: DataLoaderCreatorBaseOptions<any, any>) {
    return createBatchLoader(this.communityTypeInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'CommunityContributorType',
      resolveToNull: options?.resolveToNull,
    });
  }

  private async communityTypeInBatch(
    keys: ReadonlyArray<string>
  ): Promise<{ id: string; type: RoleSetContributorType }[]> {
    const results: { id: string; type: RoleSetContributorType }[] = [];

    // Query each contributor type separately
    const users = await this.db.query.users.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
      columns: { id: true },
    });

    const organizations = await this.db.query.organizations.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
      columns: { id: true },
    });

    const virtualContributors = await this.db.query.virtualContributors.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
      columns: { id: true },
    });

    // Map results to their types
    for (const user of users) {
      results.push({ id: user.id, type: RoleSetContributorType.USER });
    }
    for (const org of organizations) {
      results.push({ id: org.id, type: RoleSetContributorType.ORGANIZATION });
    }
    for (const vc of virtualContributors) {
      results.push({ id: vc.id, type: RoleSetContributorType.VIRTUAL });
    }

    return results;
  }
}
