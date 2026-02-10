import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IContributor } from '../contributor/contributor.interface';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';

@ObjectType('Organization', {
  implements: () => [IGroupable, IContributor],
})
export class IOrganization extends IContributorBase implements IContributor {
  roleSet!: IRoleSet;
  accountID!: string;

  rowId!: number;

  settings!: IOrganizationSettings;

  groups?: IUserGroup[];

  @Field(() => String, {
    nullable: true,
    description: 'Legal name - required if hosting an Space',
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

  storageAggregator?: IStorageAggregator;
}
