import { LicenseFeatureFlagName } from '@common/enums/license.feature.flag.name';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensePolicyRuleFeatureFlag')
export abstract class ILicensePolicyRuleFeatureFlag {
  @Field(() => LicenseFeatureFlagName)
  featureFlagName!: LicenseFeatureFlagName;

  @Field(() => [LicensePrivilege])
  grantedPrivileges!: LicensePrivilege[];

  @Field(() => String, { nullable: true })
  name!: string;
}
