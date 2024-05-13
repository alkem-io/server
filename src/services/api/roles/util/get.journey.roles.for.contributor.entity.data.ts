import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Space } from '@domain/space/space/space.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceLevel } from '@common/enums/space.level';

export const getJourneyRolesForContributorEntityData = async (
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
      account: true,
      profile: true,
    };

    if (visibility) {
      where = {
        id: In(ids),
        level: In(levels),
        account: {
          license: {
            visibility: In(visibility),
          },
        },
      };
      relations = {
        profile: true,
        account: {
          license: {
            featureFlags: true,
          },
        },
      };
    }
    const results = entityManager.find(ref, {
      where,
      relations,
      select: {
        profile: {
          displayName: true,
        },
        account: {
          id: true,
          license: true,
        },
      },
    } as FindManyOptions);
    return results;
  };

  const [spaces, subspaces] = await Promise.all([
    fetchData(Space, spaceIds, [SpaceLevel.SPACE], spaceAllowedVisibilities),
    fetchData(Space, spaceIds, [SpaceLevel.CHALLENGE, SpaceLevel.OPPORTUNITY]),
  ]);

  return { spaces, subspaces };
};
