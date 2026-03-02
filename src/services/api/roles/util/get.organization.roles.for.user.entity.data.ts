import { Organization } from '@src/domain/community/organization';
import { EntityManager, In } from 'typeorm';

export const getOrganizationRolesForUserEntityData = (
  entityManager: EntityManager,
  organizationIds: string[]
): Promise<Organization[]> => {
  return entityManager.find(Organization, {
    where: {
      id: In(organizationIds),
    },
    relations: { profile: true },
    select: {
      id: true,
      profile: {
        displayName: true,
      },
    },
  });
};
