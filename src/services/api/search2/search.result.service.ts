import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { groupBy } from 'lodash';
import { Space } from '@domain/challenge/space/space.entity';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from '@services/api/search/dto/search.result.dto.entry.challenge';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IOpportunity, Opportunity } from '@domain/collaboration/opportunity';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ISearchResultOpportunity } from '@services/api/search/dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from '@services/api/search/dto/search.result.dto.entry.user';
import { IUser, User } from '@domain/community/user';
import { ISearchResultOrganization } from '@services/api/search/dto/search.result.dto.entry.organization';
import { IOrganization, Organization } from '@domain/community/organization';
import { ISearchResults } from '@services/api/search/dto/search.result.dto';
import { ISearchResultPost } from '@services/api/search/dto/search.result.dto.entry.post';
import { Post } from '@domain/collaboration/post';
import { EntityNotFoundException } from '@common/exceptions';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { AgentInfo } from '@core/authentication';

export type PostParents = {
  callout: ICallout;
  space: ISpace;
  challenge: IChallenge | undefined;
  opportunity: IOpportunity | undefined;
};

export type PostParentIDs = {
  calloutID: string;
  spaceID: string;
  challengeID: string | undefined;
  opportunityID: string | undefined;
};

@Injectable()
export class SearchResultService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager
  ) {}

  public async resolveSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResults> {
    const groupedResults = groupBy(rawSearchResults, 'type');
    // todo: authorize groupedResults first
    const [spaces, challenges, opportunities, users, organizations, posts] =
      await Promise.all([
        this.getSpaceSearchResults(groupedResults.space),
        this.getChallengeSearchResults(groupedResults.challenge),
        this.getOpportunitySearchResults(groupedResults.opportunity),
        this.getUserSearchResults(groupedResults.user),
        this.getOrganizationSearchResults(groupedResults.organization),
        this.getPostSearchResults(groupedResults.post),
      ]);
    // todo: count
    return {
      contributorResults: [...users, ...organizations],
      contributorResultsCount: -1,
      contributionResults: [...posts],
      contributionResultsCount: -1,
      journeyResults: [...spaces, ...challenges, ...opportunities],
      journeyResultsCount: -1,
      groupResults: [],
    };
  }
  // todo: heavy copy-pasting below: could be refactored
  public async getSpaceSearchResults(
    rawSearchResults: ISearchResult[]
  ): Promise<ISearchResultSpace[]> {
    const spaceIds = rawSearchResults.map(result => result.id);

    const spaces = await this.entityManager.findBy(Space, {
      id: In(spaceIds),
    });

    return spaces
      .map<ISearchResultSpace | undefined>(space => {
        const rawSearchResult = rawSearchResults.find(
          result => result.id === space.id
        );

        if (!rawSearchResult) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          space: space as ISpace,
        };
      })
      .filter((space): space is ISearchResultSpace => !!space);
  }

  public async getChallengeSearchResults(
    rawSearchResults: ISearchResult[]
  ): Promise<ISearchResultChallenge[]> {
    const challengeIds = rawSearchResults.map(result => result.id);

    const challenges = await this.entityManager.find(Challenge, {
      where: { id: In(challengeIds) },
      relations: { parentSpace: true },
      select: { parentSpace: { id: true } },
    });

    return challenges
      .map<ISearchResultChallenge | undefined>(challenge => {
        const rawSearchResult = rawSearchResults.find(
          result => result.id === challenge.id
        );

        if (!rawSearchResult) {
          return undefined;
        }

        if (!challenge.parentSpace) {
          throw new BaseException(
            'Unable to find parent space for challenge while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              challengeId: challenge.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        return {
          ...rawSearchResult,
          challenge: challenge as IChallenge,
          space: challenge.parentSpace as ISpace,
        };
      })
      .filter((challenge): challenge is ISearchResultChallenge => !!challenge);
  }

  public async getOpportunitySearchResults(
    rawSearchResults: ISearchResult[]
  ): Promise<ISearchResultChallenge[]> {
    const opportunityIds = rawSearchResults.map(result => result.id);

    const opportunities = await this.entityManager.find(Opportunity, {
      where: { id: In(opportunityIds) },
      relations: { challenge: { parentSpace: true } },
      select: { challenge: { id: true, parentSpace: { id: true } } },
    });

    return opportunities
      .map<ISearchResultChallenge | undefined>(opportunity => {
        const rawSearchResult = rawSearchResults.find(
          result => result.id === opportunity.id
        );

        if (!rawSearchResult) {
          return undefined;
        }

        if (!opportunity.challenge) {
          throw new BaseException(
            'Unable to find parent challenge for opportunity while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              opportunityId: opportunity.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        if (!opportunity.challenge.parentSpace) {
          throw new BaseException(
            'Unable to find parent space for challenge while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              challengeId: opportunity.challenge.id,
              opportunityId: opportunity.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        return {
          ...rawSearchResult,
          opportunity: opportunity as IOpportunity,
          challenge: opportunity.challenge as IChallenge,
          space: opportunity.challenge.parentSpace as ISpace,
        };
      })
      .filter(
        (opportunity): opportunity is ISearchResultOpportunity => !!opportunity
      );
  }

  public async getUserSearchResults(
    rawSearchResults: ISearchResult[]
  ): Promise<ISearchResultUser[]> {
    const userIds = rawSearchResults.map(result => result.id);

    const users = await this.entityManager.findBy(User, {
      id: In(userIds),
    });

    return users
      .map<ISearchResultUser | undefined>(user => {
        const rawSearchResult = rawSearchResults.find(
          result => result.id === user.id
        );

        if (!rawSearchResult) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          user: user as IUser,
        };
      })
      .filter((user): user is ISearchResultUser => !!user);
  }

  public async getOrganizationSearchResults(
    rawSearchResults: ISearchResult[]
  ): Promise<ISearchResultOrganization[]> {
    const orgIds = rawSearchResults.map(result => result.id);

    const organizations = await this.entityManager.findBy(Organization, {
      id: In(orgIds),
    });

    return organizations
      .map<ISearchResultOrganization | undefined>(org => {
        const rawSearchResult = rawSearchResults.find(
          result => result.id === org.id
        );

        if (!rawSearchResult) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          organization: org as IOrganization,
        };
      })
      .filter((org): org is ISearchResultOrganization => !!org);
  }

  public async getPostSearchResults(
    rawSearchResults: ISearchResult[]
  ): Promise<ISearchResultPost[]> {
    const postIds = rawSearchResults.map(result => result.id);

    const posts = await this.entityManager.findBy(Post, {
      id: In(postIds),
    });

    const postResults: ISearchResultPost[] = [];
    // todo: could be optimized
    // make getPostParents for all posts in one query
    for (const post of posts) {
      const rawSearchResult = rawSearchResults.find(
        result => result.id === post.id
      );

      if (!rawSearchResult) {
        continue;
      }

      const postParents: PostParents = await this.getPostParents(
        rawSearchResult.result.id
      );

      postResults.push({
        ...rawSearchResult,
        ...postParents,
        post,
      });
    }

    return postResults;
  }

  private async getPostParents(postId: string): Promise<PostParents> {
    const [queryResult]: PostParentIDs[] =
      await this.entityManager.connection.query(
        `
      SELECT \`space\`.\`id\` as \`spaceID\`, \`challenge\`.\`id\` as \`challengeID\`, null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`space\` on \`challenge\`.\`spaceID\` = \`space\`.\`id\`
      JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
      JOIN \`post\` on \`post\`.\`id\` = \`callout_contribution\`.\`postId\`
      WHERE \`post\`.\`id\` = '${postId}' UNION

      SELECT \`space\`.\`id\` as \`spaceID\`, null as \'challengeID\', null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\`  FROM \`callout\`
      RIGHT JOIN \`space\` on \`space\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
      JOIN \`post\` on \`post\`.\`id\` = \`callout_contribution\`.\`postId\`
      WHERE \`post\`.\`id\` = '${postId}' UNION

      SELECT  \`space\`.\`id\` as \`spaceID\`, \`challenge\`.\`id\` as \`challengeID\`, \`opportunity\`.\`id\` as \`opportunityID\`, \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`challenge\` on \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      JOIN \`space\` on \`opportunity\`.\`spaceID\` = \`space\`.\`id\`
      JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
      JOIN \`post\` on \`post\`.\`id\` = \`callout_contribution\`.\`postId\`
      WHERE \`post\`.\`id\` = '${postId}';
      `
      );

    let challenge: IChallenge | undefined = undefined;
    let opportunity: IOpportunity | undefined = undefined;

    if (!queryResult) {
      throw new EntityNotFoundException(
        `Unable to find parents for post with ID: ${postId}`,
        LogContext.SEARCH
      );
    }

    const callout = await this.entityManager.findOneByOrFail(Callout, {
      id: queryResult.calloutID,
    });

    const space = await this.entityManager.findOneByOrFail(Space, {
      id: queryResult.spaceID,
    });

    if (queryResult.challengeID) {
      challenge = await this.entityManager
        .findOneBy(Challenge, {
          id: queryResult.challengeID,
        })
        .then(x => (x === null ? undefined : x));
    }

    if (queryResult.opportunityID) {
      opportunity = await this.entityManager
        .findOneBy(Opportunity, {
          id: queryResult.opportunityID,
        })
        .then(x => (x === null ? undefined : x));
    }

    return { challenge, opportunity, callout, space };
  }
}
