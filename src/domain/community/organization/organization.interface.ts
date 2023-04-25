import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { IPreferenceSet } from '@domain/common/preference-set';
import { IContributor } from '../contributor/contributor.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@ObjectType('Organization', {
  implements: () => [IGroupable],
})
export class IOrganization extends IContributor {
  rowId!: number;

  groups?: IUserGroup[];

  @Field(() => String, {
    nullable: true,
    description: 'Legal name - required if hosting an Hub',
  })
  legalEntityName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization website',
  })
  website?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization contact email',
  })
  contactEmail?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Domain name; what is verified, eg. alkem.io',
  })
  domain?: string;

  @Field(() => IOrganizationVerification, { nullable: false })
  verification?: IOrganizationVerification;

  preferenceSet?: IPreferenceSet;
  storageBucket?: IStorageBucket;
}
