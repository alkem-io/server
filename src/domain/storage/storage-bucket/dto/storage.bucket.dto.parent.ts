import { ProfileType } from '@common/enums/profile.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('StorageBucketParent')
export abstract class IStorageBucketParent {
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
