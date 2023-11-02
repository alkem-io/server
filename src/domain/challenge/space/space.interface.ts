import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IJourney } from '../base-challenge/journey.interface';

@ObjectType('Space', {
  implements: () => [IJourney],
})
export class ISpace extends IJourney {
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
