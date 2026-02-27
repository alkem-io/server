import { Organization } from '@src/domain/community/organization';
import { EntityManager, FindManyOptions, In } from 'typeorm';

export const getOrganizationRolesForUserEntityData = (
  entityManager: EntityManager,
  organizationIds: string[]
): Promise<Organization[]> => {
  return entityManager.find(Organization, {
    where: {
      id: In(organizationIds),
    },
    relations: { actor: { profile: true } },
    select: {
      id: true,
      actor: {
        id: true,
        profile: {
          displayName: true,
        },
      },
    },
  } as FindManyOptions);
};
