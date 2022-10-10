import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FeatureFlag {
  @Field(() => String, {
    description: 'The name of the feature flag',
  })
  name!: string;

  @Field(() => Boolean, {
    description: 'Whether the feature flag is enabled / disabled.',
  })
  enabled!: boolean;
}
