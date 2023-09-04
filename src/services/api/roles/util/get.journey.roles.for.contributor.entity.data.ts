import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
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
    return entityManager.find(ref, {
      where: {
        id: In(ids),
        visibility: visibility ? In(visibility) : undefined,
      },
      relations: { profile: true },
      select: {
        profile: {
          displayName: true,
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
