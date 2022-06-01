import { IGroupable } from '@domain/common';
import { IOrganization } from '@domain/community';
import { ICommunity } from '@domain/community/community';

export const isCommunity = (groupable: IGroupable): groupable is ICommunity =>
  'hubID' in groupable;

export const isOrganization = (
  groupable: IGroupable
): groupable is IOrganization => 'legalEntityName' in groupable;
