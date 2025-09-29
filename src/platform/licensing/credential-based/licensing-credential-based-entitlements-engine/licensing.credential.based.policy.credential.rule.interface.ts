import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';

@ObjectType('LicensingCredentialBasedPolicyCredentialRule')
export abstract class ILicensingCredentialBasedPolicyCredentialRule {
  @Field(() => String)
  id!: string;

  @Field(() => LicensingCredentialBasedCredentialType)
  credentialType!: LicensingCredentialBasedCredentialType;

  @Field(() => [LicensingGrantedEntitlement])
  grantedEntitlements!: LicensingGrantedEntitlement[];

  @Field(() => String, { nullable: true })
  name?: string;
}
