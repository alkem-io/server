import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';

@Injectable()
export class CommunityTypeLoaderCreator
  implements DataLoaderCreator<CommunityContributorType>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create() {
    return createBatchLoader(this.constructor.name, communityTypeInBatch);
  }
}

const communityTypeInBatch = (
  keys: ReadonlyArray<string>
): Promise<(CommunityContributorType | Error)[]> => {
  return [] as any;
};
