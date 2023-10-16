import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@ObjectType('Space')
export class ISpace extends IBaseChallenge {
  rowId!: number;
  @Field(() => SpaceVisibility, {
    description: 'Visibility of the Space.',
    nullable: false,
  })
  visibility?: SpaceVisibility;

  challenges?: IChallenge[];

  templatesSet?: ITemplatesSet;
  storageAggregator?: IStorageAggregator;
}
