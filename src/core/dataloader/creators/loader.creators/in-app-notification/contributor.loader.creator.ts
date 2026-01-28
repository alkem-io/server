import { EntityNotFoundException } from '@common/exceptions';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { IContributorBase } from '@domain/community/contributor';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class ContributorLoaderCreator
  implements DataLoaderCreator<IContributorBase>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

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

    let result: IContributor[] = await this.manager.findBy(User, {
      id: In(keys),
    });
    contributors.push(...result);

    if (contributors.length !== keys.length) {
      result = await this.manager.findBy(Organization, { id: In(keys) });
      contributors.push(...result);
    }
    if (contributors.length !== keys.length) {
      result = await this.manager.findBy(VirtualContributor, { id: In(keys) });
      contributors.push(...result);
    }

    return contributors;
  };
}
