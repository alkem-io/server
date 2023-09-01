import { EntityManager, FindManyOptions, In } from 'typeorm';
import { Organization } from '@src/domain/community/organization';

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
      profile: {
        displayName: true,
      },
    },
  } as FindManyOptions);
};
