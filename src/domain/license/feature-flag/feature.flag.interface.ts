import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('FeatureFlag')
export abstract class IFeatureFlag {
  @Field(() => String, {
    description: 'The name of the feature flag',
  })
  name!: string;

  @Field(() => Boolean, {
    description: 'Is this feature flag enabled?',
  })
  enabled!: boolean;
}
