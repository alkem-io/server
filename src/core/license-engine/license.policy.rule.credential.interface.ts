import { LicenseCredential } from '@common/enums/license.credential';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensePolicyCredentialRule')
export abstract class ILicensePolicyCredentialRule {
  @Field(() => LicenseCredential)
  credentialType!: LicenseCredential;

  @Field(() => [LicenseEntitlementType])
  grantedEntitlements!: LicenseEntitlementType[];

  @Field(() => String, { nullable: true })
  name!: string;
}
