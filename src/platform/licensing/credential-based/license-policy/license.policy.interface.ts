import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { ILicensingCredentialBasedPolicyCredentialRule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine';

@ObjectType('LicensePolicy')
export abstract class ILicensePolicy extends IAuthorizable {
  @Field(() => [ILicensingCredentialBasedPolicyCredentialRule], {
    nullable: false,
    description:
      'The set of credential rules that are contained by this License Policy.',
  })
  credentialRules!: ILicensingCredentialBasedPolicyCredentialRule[];
}
