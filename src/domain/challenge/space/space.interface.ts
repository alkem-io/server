import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ILicense } from '@domain/license/license/license.interface';

@ObjectType('Space')
export class ISpace extends IBaseChallenge {
  rowId!: number;

  challenges?: IChallenge[];
  templatesSet?: ITemplatesSet;
  license?: ILicense;
  storageAggregator?: IStorageAggregator;
}
