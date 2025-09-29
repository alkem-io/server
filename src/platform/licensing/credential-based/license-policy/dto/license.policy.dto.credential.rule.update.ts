import { Field, InputType } from '@nestjs/graphql';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicensingGrantedEntitlementInput } from './license.policy.dto.credential.rule.granted.entitlement';

@InputType()
export class UpdateLicensePolicyCredentialRuleInput extends UpdateBaseAlkemioInput {
  @Field(() => LicensingCredentialBasedCredentialType)
  credentialType?: LicensingCredentialBasedCredentialType;

  @Field(() => [LicensingGrantedEntitlementInput])
  grantedEntitlements?: LicensingGrantedEntitlementInput[];

  @Field(() => String, { nullable: true })
  name?: string;
}
