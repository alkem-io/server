import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IContributorBase } from '@domain/community/contributor';

@Injectable()
export class ContributorLoaderCreator
  implements DataLoaderCreator<IContributorBase>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IContributor> {
    return createBatchLoader(
      this.constructor.name,
      'Contributor',
      this.contributorsInBatch
    );
  }

  private contributorsInBatch = async (
    keys: ReadonlyArray<string>
  ): Promise<(User | Organization | VirtualContributor)[]> => {
    // do when we actually need all contributors
    // const a = await this.manager.query(`
    //   SELECT \`user\`.\`id\`, 'User' AS \`type\`
    //   FROM \`user\`
    //   WHERE \`user\`.\`id\` IN (${strKeys})
    //
    //   UNION
    //
    //   SELECT \`vc\`.\`id\`, 'VirtualContributor' AS \`type\`
    //   FROM \`virtual_contributor\` \`vc\`
    //   WHERE \`vc\`.\`id\` IN (${strKeys})
    //
    //   UNION
    //
    //   SELECT \`organization\`.\`id\`, 'Organization' AS \`type\`
    //   FROM \`organization\`
    //   WHERE \`organization\`.\`id\` IN (${strKeys});
    // `);

    return this.manager.findBy(User, { id: In(keys) });
  };
}
