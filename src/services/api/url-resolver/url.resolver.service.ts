import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import { ValidationException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { URL_PATHS } from '@common/constants/url.path.constants';
import { ForumDiscussionLookupService } from '@platform/forum-discussion-lookup/forum.discussion.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { SpaceService } from '@domain/space/space/space.service';
import { ISpace } from '@domain/space/space/space.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Callout } from '@domain/collaboration/callout';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { UrlType } from '@common/enums/url.type';
import { UrlResolverQueryResultSpace } from './dto/url.resolver.query.space.result';
import { match } from 'path-to-regexp';

@Injectable()
export class UrlResolverService {
  private spacePathMatcher = match(
    `/:spaceNameID{/${URL_PATHS.CHALLENGES}/:challengeNameID}{/${URL_PATHS.OPPORTUNITIES}/:opportunityNameID}{/*path}`
  );
  private spaceInternalPathMatcher = match(
    `{/${URL_PATHS.COLLABORATION}/:calloutNameID}{/${URL_PATHS.POSTS}/:postNameID}{/${URL_PATHS.WHITEBOARDS}/:whiteboardNameID}{/*path}`
  );

  constructor(
    private authorizationService: AuthorizationService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private forumDiscussionLookupService: ForumDiscussionLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private spaceLookupService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async resolveUrl(
    url: string,
    agentInfo: AgentInfo
  ): Promise<UrlResolverQueryResults> {
    const pathElements = this.getPathElements(url);

    const result: UrlResolverQueryResults = {
      type: UrlType.UNKNOWN,
    };

    if (pathElements.length === 0) {
      throw new ValidationException(
        `Invalid URL: ${url}`,
        LogContext.URL_GENERATOR
      );
    }

    const urlPathRoot = pathElements[0];

    switch (urlPathRoot) {
      case URL_PATHS.USER:
        if (pathElements.length !== 2) {
          throw new ValidationException(
            `Invalid URL: ${url}`,
            LogContext.URL_GENERATOR
          );
        }
        const user = await this.userLookupService.getUserByNameIdOrFail(
          pathElements[1]
        );
        result.userId = user.id;
        result.type = UrlType.USER;
        return result;
      case URL_PATHS.VIRTUAL_CONTRIBUTOR:
        if (pathElements.length !== 2) {
          throw new ValidationException(
            `Invalid URL: ${url}`,
            LogContext.URL_GENERATOR
          );
        }
        const vc =
          await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
            pathElements[1]
          );
        result.vcId = vc.id;
        result.type = UrlType.VIRTUAL_CONTRIBUTOR;
        return result;
      case URL_PATHS.ORGANIZATION:
        if (pathElements.length !== 2) {
          throw new ValidationException(
            `Invalid URL: ${url}`,
            LogContext.URL_GENERATOR
          );
        }
        const organization =
          await this.organizationLookupService.getOrganizationByNameIdOrFail(
            pathElements[1]
          );
        result.organizationId = organization.id;
        result.type = UrlType.ORGANIZATION;
        return result;
      case URL_PATHS.ADMIN:
        result.type = UrlType.ADMIN;
        return result;
      case URL_PATHS.INNOVATION_LIBRARY:
        result.type = UrlType.INNOVATION_LIBRARY;
        return result;
      case URL_PATHS.INNOVATION_PACKS:
        result.type = UrlType.INNOVATION_PACKS;
        return result;
      case URL_PATHS.FORUM: {
        result.type = UrlType.FORUM;
        if (pathElements[1] === URL_PATHS.DISCUSSION) {
          const discussion =
            await this.forumDiscussionLookupService.getForumDiscussionByNameIdOrFail(
              pathElements[2]
            );
          result.discussionId = discussion.id;
          result.type = UrlType.DISCUSSION;
        }
        return result;
      }
    }

    const urlPath = this.getPath(url);

    // Assumption is that everything else is a Space!
    await this.populateSpaceResult(result, agentInfo, urlPath);

    return await this.populateCollaborationResult(result, agentInfo);
  }

  private getMatchedResultAsString(
    matchedResult: string | string[] | undefined
  ): string | undefined {
    if (!matchedResult) {
      return undefined;
    }
    if (Array.isArray(matchedResult)) {
      return matchedResult[0];
    }
    return matchedResult;
  }

  private getMatchedResultAsPath(
    matchedResult: string | string[] | undefined
  ): string | undefined {
    if (!matchedResult) {
      return undefined;
    }
    if (Array.isArray(matchedResult)) {
      return this.createPathFromElements(matchedResult);
    }
    return `/${matchedResult}`;
  }

  private async populateSpaceResult(
    result: UrlResolverQueryResults,
    agentInfo: AgentInfo,
    url: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.SPACE;
    const spacePathMatch = this.spacePathMatcher(url);
    if (!spacePathMatch || !spacePathMatch.params) {
      throw new ValidationException(
        `Invalid URL: ${url}`,
        LogContext.URL_GENERATOR
      );
    }
    const params = spacePathMatch.params as {
      spaceNameID?: string | string[];
      challengeNameID?: string | string[];
      opportunityNameID?: string | string[];
      path?: string | string[];
    };

    const spaceNameID = this.getMatchedResultAsString(params.spaceNameID);
    const subspaceNameID = this.getMatchedResultAsString(
      params.challengeNameID
    );
    const subsubspaceNameID = this.getMatchedResultAsString(
      params.opportunityNameID
    );
    const spaceInternalPath = this.getMatchedResultAsPath(params.path);

    if (!spaceNameID) {
      throw new ValidationException(
        `Invalid URL: ${url}`,
        LogContext.URL_GENERATOR
      );
    }

    const space = await this.spaceLookupService.getSpaceByNameIdOrFail(
      spaceNameID,
      this.spaceRelations
    );
    result.space = this.createSpaceResult(
      space,
      agentInfo,
      url,
      spaceInternalPath
    );

    if (subspaceNameID) {
      const subspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          subspaceNameID,
          space.id,
          this.spaceRelations
        );
      const parentSpaces = [space.id];
      result.space = this.createSpaceResult(
        subspace,
        agentInfo,
        url,
        spaceInternalPath
      );
      result.space.parentSpaces = parentSpaces;
    }
    if (subsubspaceNameID) {
      const subsubspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          subsubspaceNameID,
          space.id,
          this.spaceRelations
        );

      const parentSpaceID = result.space.id;
      const parentSpaces = [...result.space.parentSpaces, parentSpaceID];
      result.space = this.createSpaceResult(
        subsubspace,
        agentInfo,
        url,
        spaceInternalPath
      );
      result.space.parentSpaces = parentSpaces;
    }
    return result;
  }

  private createPathFromElements(pathElements: string[]): string {
    // Note: any domain works, we just need a valid URL base
    return '/' + pathElements.join('/');
  }

  private async populateCollaborationResult(
    result: UrlResolverQueryResults,
    agentInfo: AgentInfo
  ): Promise<UrlResolverQueryResults> {
    if (!result.space) {
      throw new ValidationException(
        `Space not provided: ${result.type}`,
        LogContext.URL_GENERATOR
      );
    }
    if (!result.space.internalPath) {
      return result;
    }

    const internalPath = result.space.internalPath;
    const collaborationMatch = this.spaceInternalPathMatcher(internalPath);
    if (!collaborationMatch || !collaborationMatch.params) {
      return result;
    }

    const params = collaborationMatch.params as {
      calloutNameID?: string | string[];
      postNameID?: string | string[];
      whiteboardNameID?: string | string[];
      path?: string | string[];
    };

    const calloutNameID = this.getMatchedResultAsString(params.calloutNameID);
    const postNameID = this.getMatchedResultAsString(params.postNameID);
    const whiteboardNameID = this.getMatchedResultAsString(
      params.whiteboardNameID
    );
    const collaborationInternalPath = this.getMatchedResultAsPath(params.path);
    if (!calloutNameID) {
      return result;
    }

    // Assume have a callout
    const callout = await this.entityManager.findOneOrFail(Callout, {
      where: {
        nameID: calloutNameID,
      },
      relations: {
        authorization: true,
        contributions: {
          post: true,
          whiteboard: true,
        },
      },
    });
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `resolving url for callout ${internalPath}`
    );
    result.space.collaboration.calloutId = callout.id;
    result.type = UrlType.CALLOUT;
    result.space.internalPath = collaborationInternalPath;
    if (!postNameID && !whiteboardNameID) {
      return result;
    }

    // Check for post contribution
    if (postNameID) {
      const contribution = await this.entityManager.findOneOrFail(
        CalloutContribution,
        {
          where: {
            callout: {
              id: callout.id,
            },
            post: {
              nameID: postNameID,
            },
          },
          relations: {
            authorization: true,
            post: true,
          },
        }
      );
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        contribution.authorization,
        AuthorizationPrivilege.READ,
        `resolving url for post on callout ${internalPath}`
      );
      result.space.collaboration.contributionId = contribution.id;
      result.type = UrlType.CONTRIBUTION_POST;
      result.space.collaboration.postId = contribution?.post?.id;
      return result;
    }

    // Check for whiteboard contribution
    if (whiteboardNameID) {
      const contribution = await this.entityManager.findOneOrFail(
        CalloutContribution,
        {
          where: {
            callout: {
              id: callout.id,
            },
            whiteboard: {
              nameID: whiteboardNameID,
            },
          },
          relations: {
            authorization: true,
            whiteboard: true,
          },
        }
      );
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        contribution.authorization,
        AuthorizationPrivilege.READ,
        `resolving url for whiteboard on callout ${internalPath}`
      );
      result.space.collaboration.contributionId = contribution.id;
      result.type = UrlType.CONTRIBUTION_WHITEBOARD;
      result.space.collaboration.whiteboardId = contribution?.whiteboard?.id;
      return result;
    }

    return result;
  }

  private getPathElements(url: string): string[] {
    const parsedUrl = new URL(url);

    const pathElements = parsedUrl.pathname.split('/').filter(Boolean);
    return pathElements;
  }

  private getPath(url: string): string {
    const parsedUrl = new URL(url);

    return parsedUrl.pathname;
  }

  private createSpaceResult(
    space: ISpace | null,
    agentInfo: AgentInfo,
    url: string,
    internalSpacePath: string | undefined
  ): UrlResolverQueryResultSpace {
    if (!space) {
      throw new ValidationException(
        'Space not provided',
        LogContext.URL_GENERATOR
      );
    }
    if (!space.collaboration) {
      throw new ValidationException(
        `Space ${space.id} does not have a collaboration`,
        LogContext.URL_GENERATOR
      );
    }
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      `resolving url ${url}`
    );
    const result: UrlResolverQueryResultSpace = {
      id: space.id,
      level: space.level,
      parentSpaces: [],
      collaboration: {
        id: space.collaboration.id,
        calloutsSetId: space.collaboration.calloutsSet?.id,
      },
      levelZeroSpaceID: space.levelZeroSpaceID,
      internalPath: internalSpacePath,
    };
    return result;
  }

  private spaceRelations = {
    relations: {
      collaboration: {
        calloutsSet: {
          callouts: {
            contributions: true,
          },
        },
      },
      community: {
        roleSet: true,
      },
    },
  };
}
