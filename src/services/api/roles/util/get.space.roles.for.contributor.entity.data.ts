import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Space } from '@domain/space/space/space.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceLevel } from '@common/enums/space.level';

export const getSpaceRolesForContributorEntityData = async (
  entityManager: EntityManager,
  spaceIds: string[],
  spaceAllowedVisibilities: SpaceVisibility[]
) => {
  const fetchData = <T extends Space>(
    ref: EntityTarget<T>,
    ids: string[],
    levels: number[],
    visibility?: SpaceVisibility[]
  ): Promise<T[]> => {
    let where: any = {
      id: In(ids),
      level: In(levels),
    };

    let relations: any = {
      profile: true,
    };

    if (visibility) {
      where = {
        id: In(ids),
        level: In(levels),
        visibility: In(visibility),
      };
      relations = {
        profile: true,
      };
    }
    const results = entityManager.find(ref, {
      where,
      relations,
      select: {
        profile: {
          displayName: true,
        },
      },
    } as FindManyOptions);
    return results;
  };

  const [spaces, subspaces] = await Promise.all([
    fetchData(Space, spaceIds, [SpaceLevel.L0], spaceAllowedVisibilities),
    fetchData(Space, spaceIds, [SpaceLevel.L1, SpaceLevel.L2]),
  ]);

  return { spaces, subspaces };
};
