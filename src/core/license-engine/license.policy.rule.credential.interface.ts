import { LicenseCredential } from '@common/enums/license.credential';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensePolicyCredentialRule')
export abstract class ILicensePolicyCredentialRule {
  @Field(() => LicenseCredential)
  credentialType!: LicenseCredential;

  @Field(() => [LicensePrivilege])
  grantedPrivileges!: LicensePrivilege[];

  @Field(() => String, { nullable: true })
  name!: string;
}
