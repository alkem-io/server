import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { OrganizationVerification } from '../organization-verification/organization.verification.entity';
import { IOrganization } from './organization.interface';

export class Organization
  extends ContributorBase
  implements IOrganization, IGroupable
{
  accountID!: string;

  settings!: IOrganizationSettings;

  rowId!: number;

  groups?: UserGroup[];

  legalEntityName?: string = '';

  domain?: string = '';

  website?: string = '';

  contactEmail?: string = '';

  verification!: OrganizationVerification;

  storageAggregator?: StorageAggregator;

  roleSet!: RoleSet;
}
