import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensingCredentialBasedPolicyCredentialRule')
export abstract class ILicensingCredentialBasedPolicyCredentialRule {
  @Field(() => LicensingCredentialBasedCredentialType)
  credentialType!: LicensingCredentialBasedCredentialType;

  @Field(() => [LicenseEntitlementType])
  grantedEntitlements!: LicenseEntitlementType[];

  @Field(() => String, { nullable: true })
  name!: string;
}
