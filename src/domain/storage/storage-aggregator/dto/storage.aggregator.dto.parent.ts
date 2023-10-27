import { StorageAggregatorParentType } from '@common/enums/storage.aggregator.parent.type';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('StorageAggregatorParent')
export abstract class IStorageAggregatorParent {
  @Field(() => UUID, {
    nullable: false,
    description: 'The UUID of the parent entity.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The display name.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The URL that can be used to access the parent entity.',
  })
  url!: string;

  @Field(() => StorageAggregatorParentType, {
    nullable: false,
    description: 'The Type of the parent Entity, space/challenge/opportunity.',
  })
  type!: string;
}
