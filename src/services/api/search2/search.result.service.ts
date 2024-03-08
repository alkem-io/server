import { Inject, Injectable, LoggerService } from '@nestjs/common';
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
import {
  AlkemioErrorStatus,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationService } from '@core/authorization/authorization.service';

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
    private readonly entityManager: EntityManager,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async resolveSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResults> {
    const groupedResults = groupBy(rawSearchResults, 'type');
    // authorize entities with requester and enrich with data
    const [spaces, challenges, opportunities, users, organizations, posts] =
      await Promise.all([
        this.getSpaceSearchResults(groupedResults.space ?? [], agentInfo),
        this.getChallengeSearchResults(
          groupedResults.challenge ?? [],
          agentInfo
        ),
        this.getOpportunitySearchResults(
          groupedResults.opportunity ?? [],
          agentInfo
        ),
        this.getUserSearchResults(groupedResults.user ?? [], agentInfo),
        this.getOrganizationSearchResults(
          groupedResults.organization ?? [],
          agentInfo
        ),
        this.getPostSearchResults(groupedResults.post ?? [], agentInfo),
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
      calloutResults: [],
    };
  }
  // todo: heavy copy-pasting below: must be refactored
  public async getSpaceSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultSpace[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const spaceIds = rawSearchResults.map(hit => hit.result.id);

    const spaces = await this.entityManager.findBy(Space, {
      id: In(spaceIds),
    });

    return spaces
      .map<ISearchResultSpace | undefined>(space => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === space.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for space: ${space.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            space.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
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
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultChallenge[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const challengeIds = rawSearchResults.map(hit => hit.result.id);

    const challenges = await this.entityManager.find(Challenge, {
      where: { id: In(challengeIds) },
      relations: { parentSpace: true },
      select: { parentSpace: { id: true } },
    });

    return challenges
      .map<ISearchResultChallenge | undefined>(challenge => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === challenge.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Challenge: ${challenge.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            challenge.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
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
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultChallenge[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const opportunityIds = rawSearchResults.map(hit => hit.result.id);

    const opportunities = await this.entityManager.find(Opportunity, {
      where: { id: In(opportunityIds) },
      relations: { challenge: { parentSpace: true } },
      select: { challenge: { id: true, parentSpace: { id: true } } },
    });

    return opportunities
      .map<ISearchResultChallenge | undefined>(opportunity => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === opportunity.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Opportunity: ${opportunity.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            opportunity.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
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
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultUser[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const userIds = rawSearchResults.map(hit => hit.result.id);

    const users = await this.entityManager.findBy(User, {
      id: In(userIds),
    });

    return users
      .map<ISearchResultUser | undefined>(user => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === user.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for User: ${user.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }
        // is that needed?
        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            user.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
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
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultOrganization[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const orgIds = rawSearchResults.map(hit => hit.result.id);

    const organizations = await this.entityManager.findBy(Organization, {
      id: In(orgIds),
    });

    return organizations
      .map<ISearchResultOrganization | undefined>(org => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === org.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Organization: ${org.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            org.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
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
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultPost[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const postIds = rawSearchResults.map(hit => hit.result.id);

    const posts = await this.entityManager.findBy(Post, {
      id: In(postIds),
    });

    const postResults: ISearchResultPost[] = [];
    // todo: could be optimized
    // make getPostParents for all posts in one query
    for (const post of posts) {
      const rawSearchResult = rawSearchResults.find(
        hit => hit.result.id === post.id
      );

      if (!rawSearchResult) {
        this.logger.error(
          `Unable to find raw search result for Post: ${post.id}`,
          undefined,
          LogContext.SEARCH
        );
        continue;
      }

      if (
        !this.authorizationService.isAccessGranted(
          agentInfo,
          post.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
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
