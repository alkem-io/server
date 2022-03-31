import { registerEnumType } from '@nestjs/graphql';

export enum OrganizationPreferenceType {
  AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN = 'AuthorizationOrganizationMatchDomain',
}

registerEnumType(OrganizationPreferenceType, {
  name: 'OrganizationPreferenceType',
});
