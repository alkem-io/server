import { ProfileType } from '@common/enums/profile.type';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('StorageBucketParent')
export abstract class IStorageBucketParent {
  @Field(() => UUID, {
    nullable: false,
    description: 'The UUID of the parent entity.',
  })
  id!: string;

  @Field(() => ProfileType, {
    nullable: false,
    description:
      'The type of entity that this StorageBucket is being used with.',
  })
  type!: ProfileType;

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
}
