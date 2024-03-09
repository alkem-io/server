import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

export const getJourneyRolesForContributorEntityData = async (
  entityManager: EntityManager,
  spaceIds: string[],
  spaceAllowedVisibilities: SpaceVisibility[],
  challengeIds: string[],
  opportunityIds: string[]
) => {
  const fetchData = <T extends Space | BaseChallenge>(
    ref: EntityTarget<T>,
    ids: string[],
    visibility?: SpaceVisibility[]
  ): Promise<T[]> => {
    let where: any = {
      id: In(ids),
    };

    let relations: any = {
      profile: true,
    };

    if (visibility) {
      where = {
        id: In(ids),
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
    return entityManager.find(ref, {
      where,
      relations,
      select: {
        profile: {
          displayName: true,
        },
        account: {
          license: true,
        },
      },
    } as FindManyOptions);
  };

  const [spaces, challenges, opportunities] = await Promise.all([
    fetchData(Space, spaceIds, spaceAllowedVisibilities),
    fetchData(Challenge, challengeIds),
    fetchData(Opportunity, opportunityIds),
  ]);

  return { spaces, challenges, opportunities };
};
