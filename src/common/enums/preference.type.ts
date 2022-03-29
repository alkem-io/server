import { registerEnumType } from '@nestjs/graphql';
import { HubPreferenceType } from './hub.preference.type';
import { UserPreferenceType } from './user.preference.type';
import { ChallengePrefenceType } from '@common/enums/challenge.preference.type';
import { OrganizationPrefenceType } from '@common/enums/organization.preference.type';

export const PreferenceType = {
  ...UserPreferenceType,
  ...HubPreferenceType,
  ...ChallengePrefenceType,
  ...OrganizationPrefenceType,
};

export type PreferenceType =
  | UserPreferenceType
  | HubPreferenceType
  | ChallengePrefenceType
  | OrganizationPrefenceType;

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
