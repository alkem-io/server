import { EntityManager, EntityTarget, FindManyOptions, In } from 'typeorm';
import { Organization } from '@src/domain/community/organization';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { HubVisibility } from '@common/enums/hub.visibility';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

export const getUserRolesEntityData = async (
  entityManager: EntityManager,
  hubIds: string[],
  hubAllowedVisibilities: HubVisibility[],
  challengeIds: string[],
  opportunityIds: string[],
  organizationIds: string[]
) => {
  const fetchData = <T extends Hub | BaseChallenge | Organization>(
    ref: EntityTarget<T>,
    ids: string[],
    visibility?: HubVisibility[]
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
  const [hubs, challenges, opportunities, organizations] = await Promise.all([
    fetchData(Hub, hubIds, hubAllowedVisibilities),
    fetchData(Challenge, challengeIds),
    fetchData(Opportunity, opportunityIds),
    fetchData(Organization, organizationIds),
  ]);

  return { hubs, challenges, opportunities, organizations };
};
