import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ILicense } from '@domain/license/license/license.interface';
import { IJourney } from '../base-challenge/journey.interface';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';

@ObjectType('Space', {
  implements: () => [IJourney],
})
export class ISpace extends IBaseChallenge implements IJourney {
  rowId!: number;

  challenges?: IChallenge[];
  templatesSet?: ITemplatesSet;
  defaults?: ISpaceDefaults;
  license?: ILicense;
  storageAggregator?: IStorageAggregator;
}
