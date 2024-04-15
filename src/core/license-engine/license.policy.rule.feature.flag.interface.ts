import { LicensePrivilege } from '@common/enums/license.privilege';
import { ILicenseFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensePolicyRuleFeatureFlag')
export abstract class ILicensePolicyRuleFeatureFlag {
  @Field(() => ILicenseFeatureFlag)
  featureFlag!: ILicenseFeatureFlag;

  @Field(() => [LicensePrivilege])
  grantedPrivileges!: LicensePrivilege[];

  @Field(() => String, { nullable: true })
  name!: string;
}
