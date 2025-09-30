import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { Field, InputType } from '@nestjs/graphql';
import { LicensingGrantedEntitlementInput } from './license.policy.dto.credential.rule.granted.entitlement';

@InputType()
export class CreateLicensePolicyCredentialRuleInput {
  @Field(() => LicensingCredentialBasedCredentialType)
  credentialType!: LicensingCredentialBasedCredentialType;

  @Field(() => [LicensingGrantedEntitlementInput])
  grantedEntitlements!: LicensingGrantedEntitlementInput[];

  @Field(() => String, { nullable: false })
  name!: string;
}
