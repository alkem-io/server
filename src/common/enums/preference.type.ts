import { registerEnumType } from '@nestjs/graphql';
import { UserPreferenceType } from './user.preference.type';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';

export const PreferenceType = {
  ...UserPreferenceType,
  ...OrganizationPreferenceType,
};

export type PreferenceType = UserPreferenceType | OrganizationPreferenceType;

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
