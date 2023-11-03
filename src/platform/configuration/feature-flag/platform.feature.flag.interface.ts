import { PlatformFeatureFlagName } from '@common/enums/platform.feature.flag.name';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PlatformFeatureFlag')
export abstract class IPlatformFeatureFlag {
  @Field(() => PlatformFeatureFlagName, {
    description: 'The name of the feature flag',
    nullable: false,
  })
  name!: string;

  @Field(() => Boolean, {
    description: 'Is this feature flag enabled?',
    nullable: false,
  })
  enabled!: boolean;
}
