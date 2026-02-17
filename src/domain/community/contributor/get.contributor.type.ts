import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IContributor } from './contributor.interface';

/**
 * Structural type guards for contributor discrimination.
 * With Drizzle ORM, query results are plain objects (not class instances),
 * so instanceof checks fail. These guards use unique column presence instead.
 *
 * Unique columns per type:
 * - User: 'email', 'firstName'
 * - Organization: 'legalEntityName', 'contactEmail'
 * - VirtualContributor: 'aiPersonaID'
 */
export const isUser = (contributor: IContributor): boolean =>
  'email' in contributor && 'firstName' in contributor;

export const isOrganization = (contributor: IContributor): boolean =>
  'legalEntityName' in contributor || 'contactEmail' in contributor;

export const isVirtualContributor = (contributor: IContributor): boolean =>
  'aiPersonaID' in contributor;

export const getContributorType = (
  contributor: IContributor
): RoleSetContributorType => {
  if (isUser(contributor)) {
    return RoleSetContributorType.USER;
  }
  if (isOrganization(contributor)) {
    return RoleSetContributorType.ORGANIZATION;
  }
  if (isVirtualContributor(contributor)) {
    return RoleSetContributorType.VIRTUAL;
  }

  throw new Error(`Unable to determine contributor type for ${contributor.id}`);
};
