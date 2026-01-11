import { EntityManager, In } from 'typeorm';
import { Space } from '@domain/space/space/space.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceLevel } from '@common/enums/space.level';

export const getSpaceRolesForActorEntityData = async (
  entityManager: EntityManager,
  spaceIds: string[],
  spaceAllowedVisibilities: SpaceVisibility[]
) => {
  const fetchData = (
    ids: string[],
    levels: number[],
    visibility?: SpaceVisibility[]
  ): Promise<Space[]> => {
    if (visibility) {
      return entityManager.find(Space, {
        where: {
          id: In(ids),
          level: In(levels),
          visibility: In(visibility),
        },
        relations: {
          about: {
            profile: true,
          },
        },
      });
    } else {
      return entityManager.find(Space, {
        where: {
          id: In(ids),
          level: In(levels),
        },
        relations: {
          about: {
            profile: true,
          },
        },
      });
    }
  };

  const [spaces, subspaces] = await Promise.all([
    fetchData(spaceIds, [SpaceLevel.L0], spaceAllowedVisibilities),
    fetchData(spaceIds, [SpaceLevel.L1, SpaceLevel.L2]),
  ]);

  return { spaces, subspaces };
};
