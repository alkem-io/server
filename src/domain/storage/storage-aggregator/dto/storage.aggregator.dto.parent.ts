import { SpaceLevel } from '@common/enums/space.level';
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

  @Field(() => SpaceLevel, {
    nullable: false,
    description: 'The level of the parent Entity.',
  })
  level!: number;
}
