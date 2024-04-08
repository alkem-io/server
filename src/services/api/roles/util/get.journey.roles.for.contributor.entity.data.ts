import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceType } from '@common/enums/space.type';

export const getJourneyRolesForContributorEntityData = async (
  entityManager: EntityManager,
  spaceIds: string[],
  spaceAllowedVisibilities: SpaceVisibility[],
  subspaceIds: string[]
) => {
  const fetchData = <T extends Space>(
    ref: EntityTarget<T>,
    ids: string[],
    type: string,
    visibility?: SpaceVisibility[]
  ): Promise<T[]> => {
    let where: any = {
      id: In(ids),
      type: type,
    };

    let relations: any = {
      account: true,
      profile: true,
    };

    if (visibility) {
      where = {
        id: In(ids),
        type: type,
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

  const [spaces, subspaces, subsubspaces] = await Promise.all([
    fetchData(Space, spaceIds, SpaceType.SPACE, spaceAllowedVisibilities),
    fetchData(Space, subspaceIds, SpaceType.CHALLENGE),
    fetchData(Space, subspaceIds, SpaceType.OPPORTUNITY),
  ]);

  return { spaces, subspaces, subsubspaces };
};
