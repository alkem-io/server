import { LicenseFeatureFlagName } from '@common/enums/license.feature.flag.name';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicenseFeatureFlag')
export abstract class ILicenseFeatureFlag {
  @Field(() => LicenseFeatureFlagName, {
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
