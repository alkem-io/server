import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
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
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { UrlResolverQueryResultCalloutsSet } from './dto/url.resolver.query.callouts.set.result';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';

@Injectable()
export class UrlResolverService {
  private spacePathMatcher = match(
    `/:spaceNameID{/${URL_PATHS.CHALLENGES}/:challengeNameID}{/${URL_PATHS.OPPORTUNITIES}/:opportunityNameID}{/*path}`
  );
  private spaceInternalPathMatcherCollaboration = match(
    `/${URL_PATHS.COLLABORATION}/:calloutNameID{/${URL_PATHS.POSTS}/:postNameID}{/${URL_PATHS.WHITEBOARDS}/:whiteboardNameID}{/*path}`
  );
  private spaceInternalPathMatcherSettings = match(
    `/${URL_PATHS.SETTINGS}/${URL_PATHS.TEMPLATES}{/:templateNameID}{/*path}`
  );
  private innovationPackPathMatcher = match(
    `/${URL_PATHS.INNOVATION_PACKS}/:innovationPackNameID{/${URL_PATHS.SETTINGS}}{/:templateNameID}{/*path}`
  );
  private virtualContributorPathMatcher = match(
    `/${URL_PATHS.VIRTUAL_CONTRIBUTOR}/:virtualContributorNameID{/${URL_PATHS.KNOWLEDGE_BASE}/:calloutNameID}{/${URL_PATHS.POSTS}/:postNameID}{/*path}`
  );
  private innovationHubPathMatcher = match(
    `/${URL_PATHS.ADMIN}/${URL_PATHS.INNOVATION_HUBS}/:innovationHubNameID{/*path}`
  );

  constructor(
    private authorizationService: AuthorizationService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private forumDiscussionLookupService: ForumDiscussionLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private spaceLookupService: SpaceService,
    private innovationPackService: InnovationPackService,
    private innovationHubService: InnovationHubService,
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
        LogContext.URL_RESOLVER
      );
    }

    const urlPathRoot = pathElements[0];
    const urlPath = this.getPath(url);

    switch (urlPathRoot) {
      case URL_PATHS.USER:
        if (pathElements.length < 2) {
          throw new ValidationException(
            `Invalid URL: ${url}`,
            LogContext.URL_RESOLVER
          );
        }
        const user = await this.userLookupService.getUserByNameIdOrFail(
          pathElements[1]
        );
        result.userId = user.id;
        result.type = UrlType.USER;
        return result;
      case URL_PATHS.VIRTUAL_CONTRIBUTOR:
        return await this.populateVirtualContributorResult(
          result,
          urlPath,
          agentInfo
        );
      case URL_PATHS.ORGANIZATION:
        if (pathElements.length < 2) {
          throw new ValidationException(
            `Invalid URL: ${url}`,
            LogContext.URL_RESOLVER
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
        return await this.populateAdminResult(result, urlPath);
      case URL_PATHS.INNOVATION_LIBRARY:
        result.type = UrlType.INNOVATION_LIBRARY;
        return result;
      case URL_PATHS.INNOVATION_PACKS:
        return await this.populateInnovationPackResult(result, urlPath);
      case URL_PATHS.FORUM: {
        result.type = UrlType.FORUM;
        if (pathElements[1] === URL_PATHS.DISCUSSION) {
          if (pathElements.length < 2) {
            throw new ValidationException(
              `Invalid URL: ${url}`,
              LogContext.URL_RESOLVER
            );
          }
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

    // Assumption is that everything else is a Space!
    await this.populateSpaceResult(result, agentInfo, urlPath);

    return await this.populateSpaceInternalResult(result, agentInfo);
  }

  private async populateVirtualContributorResult(
    result: UrlResolverQueryResults,
    urlPath: string,
    agentInfo: AgentInfo
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.VIRTUAL_CONTRIBUTOR;
    const virtualContributorMatch = this.virtualContributorPathMatcher(urlPath);
    if (!virtualContributorMatch || !virtualContributorMatch.params) {
      throw new ValidationException(
        `Invalid URL: ${urlPath}`,
        LogContext.URL_RESOLVER
      );
    }
    const params = virtualContributorMatch.params as {
      virtualContributorNameID?: string | string[];
      calloutNameID?: string | string[];
      postNameID?: string | string[];
      path?: string | string[];
    };

    const virtualContributorNameID = this.getMatchedResultAsString(
      params.virtualContributorNameID
    );
    const calloutNameID = this.getMatchedResultAsString(params.calloutNameID);
    const postNameID = this.getMatchedResultAsString(params.postNameID);

    if (!virtualContributorNameID) {
      throw new ValidationException(
        `Invalid URL, unable to retrieve virtual contributor identifier: ${urlPath}`,
        LogContext.URL_RESOLVER
      );
    }

    const virtualContributor =
      await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
        virtualContributorNameID,
        {
          relations: {
            knowledgeBase: {
              calloutsSet: {
                callouts: {
                  contributions: {
                    post: true,
                    whiteboard: true,
                  },
                },
              },
            },
          },
        }
      );

    if (
      !virtualContributor.knowledgeBase ||
      !virtualContributor.knowledgeBase.calloutsSet ||
      !virtualContributor.knowledgeBase.calloutsSet.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities on Virtual Contributor ${virtualContributor.id}`,
        LogContext.URL_RESOLVER
      );
    }
    const calloutsSetResult = await this.populateCalloutsSetResult(
      virtualContributor.knowledgeBase.calloutsSet.id,
      agentInfo,
      urlPath,
      calloutNameID,
      postNameID,
      undefined
    );

    result.virtualContributor = {
      id: virtualContributor.id,
      calloutsSet: calloutsSetResult,
    };

    return result;
  }

  private async populateAdminResult(
    result: UrlResolverQueryResults,
    urlPath: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.ADMIN;
    const innovationHubMatch = this.innovationHubPathMatcher(urlPath);
    if (!innovationHubMatch || !innovationHubMatch.params) {
      return result;
    }
    const params = innovationHubMatch.params as {
      innovationHubNameID?: string | string[];
      path?: string | string[];
    };

    const innovationHubNameID = this.getMatchedResultAsString(
      params.innovationHubNameID
    );

    if (!innovationHubNameID) {
      throw new ValidationException(
        `Unable to resolve innovation hub from URL: ${urlPath}`,
        LogContext.URL_RESOLVER
      );
    }

    const innovationHub =
      await this.innovationHubService.getInnovationHubByNameIdOrFail(
        innovationHubNameID
      );
    result.innovationHubId = innovationHub.id;
    result.type = UrlType.INNOVATION_HUB;

    return result;
  }

  private async populateInnovationPackResult(
    result: UrlResolverQueryResults,
    urlPath: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.INNOVATION_PACKS;
    const innovationPackMatch = this.innovationPackPathMatcher(urlPath);
    if (!innovationPackMatch || !innovationPackMatch.params) {
      throw new ValidationException(
        `Invalid URL: ${urlPath}`,
        LogContext.URL_RESOLVER
      );
    }
    const params = innovationPackMatch.params as {
      innovationPackNameID?: string | string[];
      templateNameID?: string | string[];
      path?: string | string[];
    };

    const innovationPackNameID = this.getMatchedResultAsString(
      params.innovationPackNameID
    );
    const templateNameID = this.getMatchedResultAsString(params.templateNameID);

    if (!innovationPackNameID) {
      throw new ValidationException(
        `Invalid URL: ${urlPath}`,
        LogContext.URL_RESOLVER
      );
    }

    const innovationPack =
      await this.innovationPackService.getInnovationPackByNameIdOrFail(
        innovationPackNameID,
        {
          relations: {
            templatesSet: {
              templates: true,
            },
          },
        }
      );
    if (!innovationPack.templatesSet) {
      throw new RelationshipNotFoundException(
        `Innovation Pack ${innovationPack.id} does not have a templates set`,
        LogContext.URL_RESOLVER
      );
    }
    result.innovationPack = {
      id: innovationPack.id,
      templatesSet: {
        id: innovationPack.templatesSet.id,
      },
    };
    if (templateNameID) {
      const template = innovationPack.templatesSet.templates.find(
        t => t.nameID === templateNameID
      );
      if (!template) {
        throw new ValidationException(
          `Template ${templateNameID} not found in Innovation Pack ${innovationPack.id}`,
          LogContext.URL_RESOLVER
        );
      }
      result.innovationPack.templatesSet.templateId = template.id;
    }
    return result;
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
        LogContext.URL_RESOLVER
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
        LogContext.URL_RESOLVER
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

  private async populateSpaceInternalResult(
    result: UrlResolverQueryResults,
    agentInfo: AgentInfo
  ): Promise<UrlResolverQueryResults> {
    if (!result.space) {
      throw new ValidationException(
        `Space not provided: ${result.type}`,
        LogContext.URL_RESOLVER
      );
    }
    if (!result.space.internalPath) {
      return result;
    }

    const internalPath = result.space.internalPath;
    const collaborationMatch =
      this.spaceInternalPathMatcherCollaboration(internalPath);
    if (collaborationMatch) {
      return await this.populateSpaceInternalResultCollaboration(
        collaborationMatch,
        result,
        agentInfo,
        internalPath
      );
    }

    // Try a settings match
    const settingsMatch = this.spaceInternalPathMatcherSettings(internalPath);
    if (settingsMatch) {
      return await this.populateSpaceInternalResultSettings(
        settingsMatch,
        result
      );
    }
    return result;
  }

  private async populateSpaceInternalResultSettings(
    settingsMatch: any,
    result: UrlResolverQueryResults
  ): Promise<UrlResolverQueryResults> {
    if (!result.space) {
      throw new ValidationException(
        `Space not provided when resolving path: ${result.type}`,
        LogContext.URL_RESOLVER
      );
    }
    if (!settingsMatch.params) {
      return result;
    }
    const params = settingsMatch.params as {
      templateNameID?: string | string[];
      path?: string | string[];
    };

    const templateNameID = this.getMatchedResultAsString(params.templateNameID);

    const space = await this.spaceLookupService.getSpaceOrFail(
      result.space.levelZeroSpaceID,
      {
        relations: {
          templatesManager: {
            templatesSet: {
              templates: true,
            },
          },
        },
      }
    );
    if (
      !space.templatesManager ||
      !space.templatesManager.templatesSet ||
      !space.templatesManager.templatesSet.templates
    ) {
      throw new RelationshipNotFoundException(
        `Space ${space.id} does not have a templates set`,
        LogContext.URL_RESOLVER
      );
    }

    result.space.templatesSet = {
      id: space.templatesManager.templatesSet.id,
    };
    if (templateNameID) {
      const template = space.templatesManager.templatesSet.templates.find(
        t => t.nameID === templateNameID
      );
      if (!template) {
        throw new ValidationException(
          `Template ${templateNameID} not found in Space ${space.id}`,
          LogContext.URL_RESOLVER
        );
      }
      result.space.templatesSet.templateId = template.id;
    }

    return result;
  }

  private async populateSpaceInternalResultCollaboration(
    collaborationMatch: any,
    result: UrlResolverQueryResults,
    agentInfo: AgentInfo,
    internalPath: string
  ): Promise<UrlResolverQueryResults> {
    if (!result.space || !result.space.collaboration.calloutsSet) {
      throw new ValidationException(
        `Space not provided when resolving path: ${result.type}`,
        LogContext.URL_RESOLVER
      );
    }
    if (!collaborationMatch.params) {
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
    const calloutsSetResult = await this.populateCalloutsSetResult(
      result.space.collaboration.calloutsSet.id,
      agentInfo,
      collaborationInternalPath || internalPath,
      calloutNameID,
      postNameID,
      whiteboardNameID
    );

    result.space.collaboration.calloutsSet = calloutsSetResult;

    return result;
  }

  private async populateCalloutsSetResult(
    calloutsSetId: string,
    agentInfo: AgentInfo,
    urlPath: string,
    calloutNameID: string | undefined,
    postNameID: string | undefined,
    whiteboardNameID: string | undefined
  ): Promise<UrlResolverQueryResultCalloutsSet> {
    const result: UrlResolverQueryResultCalloutsSet = {
      id: calloutsSetId,
      type: UrlType.CALLOUTS_SET,
    };

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
      `resolving url for callout ${urlPath}`
    );
    result.calloutId = callout.id;
    result.type = UrlType.CALLOUT;
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
        `resolving url for post on callout ${urlPath}`
      );
      result.contributionId = contribution.id;
      result.postId = contribution?.post?.id;
      result.type = UrlType.CONTRIBUTION_POST;
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
        `resolving url for whiteboard on callout ${urlPath}`
      );
      result.contributionId = contribution.id;
      result.whiteboardId = contribution?.whiteboard?.id;
      result.type = UrlType.CONTRIBUTION_WHITEBOARD;
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
        LogContext.URL_RESOLVER
      );
    }
    if (!space.collaboration || !space.collaboration.calloutsSet) {
      throw new ValidationException(
        `Space ${space.id} does not have a collaboration`,
        LogContext.URL_RESOLVER
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
        calloutsSet: {
          id: space.collaboration.calloutsSet?.id,
          type: UrlType.CALLOUTS_SET,
        },
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
