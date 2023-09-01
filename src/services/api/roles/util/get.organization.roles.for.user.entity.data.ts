import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Organization } from '@src/domain/community/organization';

export const getOrganizationRolesForUserEntityData = async (
  entityManager: EntityManager,
  organizationIds: string[]
) => {
  const fetchData = <T extends Organization>(
    ref: EntityTarget<T>,
    ids: string[]
  ): Promise<T[]> => {
    return entityManager.find(ref, {
      where: {
        id: In(ids),
      },
      relations: { profile: true },
      select: {
        profile: {
          displayName: true,
        },
      },
    } as FindManyOptions);
  };
  return await Promise.all([fetchData(Organization, organizationIds)]);
};
