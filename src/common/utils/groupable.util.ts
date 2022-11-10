import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { ICommunity } from '@domain/community/community/community.interface';

export const isCommunity = (groupable: IGroupable): groupable is ICommunity =>
  'hubID' in groupable;

export const isOrganization = (
  groupable: IGroupable
): groupable is IOrganization => 'legalEntityName' in groupable;
