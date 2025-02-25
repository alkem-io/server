import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { UrlPathElement } from '@common/enums/url.path.element';
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
import { UrlPathBase } from '@common/enums/url.path.base';
import { UrlResolverException } from './url.resolver.exception';

@Injectable()
export class UrlResolverService {
  private spacePathMatcher = match(
    `/:spaceNameID{/${UrlPathElement.CHALLENGES}/:challengeNameID}{/${UrlPathElement.OPPORTUNITIES}/:opportunityNameID}{/*path}`
  );
  private spaceInternalPathMatcherCollaboration = match(
    `/${UrlPathElement.COLLABORATION}/:calloutNameID{/${UrlPathElement.POSTS}/:postNameID}{/${UrlPathElement.WHITEBOARDS}/:whiteboardNameID}{/*path}`
  );
  private spaceInternalPathMatcherCalendar = match(
    `/${UrlPathElement.CALENDAR}/:calendarEventNameId`
  );
  private spaceInternalPathMatcherSettings = match(
    `/${UrlPathElement.SETTINGS}/${UrlPathElement.TEMPLATES}{/:templateNameID}{/*path}`
  );
  private innovationPackPathMatcher = match(
    `/${UrlPathBase.INNOVATION_PACKS}/:innovationPackNameID{/${UrlPathElement.SETTINGS}}{/:templateNameID}{/*path}`
  );
  private virtualContributorPathMatcher = match(
    `/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/:virtualContributorNameID{/${UrlPathElement.KNOWLEDGE_BASE}/:calloutNameID}{/${UrlPathElement.POSTS}/:postNameID}{/*path}`
  );
  private innovationHubPathMatcher = match(
    `/${UrlPathBase.INNOVATION_HUBS}/:innovationHubNameID{/*path}`
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
      result.type = UrlType.HOME;
      return result;
    }

    const urlPathBase = pathElements[0];
    const urlPath = this.getPath(url);

    // First check for reserved top level base routes
    const baseRoute = this.getBaseRoute(urlPathBase);
    if (baseRoute) {
      try {
        return await this.resolveBaseRoute(
          result,
          baseRoute,
          pathElements,
          url,
          agentInfo
        );
      } catch (error: any) {
        throw new UrlResolverException(
          `Unable to resolve URL: ${url}`,
          LogContext.URL_RESOLVER,
          {
            message: error?.message,
            originalException: error,
          }
        );
      }
    }

    // Assumption is that everything else is a Space!
    try {
      await this.populateSpaceResult(result, agentInfo, urlPath);
      return await this.populateSpaceInternalResult(result, agentInfo);
    } catch (error: any) {
      throw new UrlResolverException(
        `Unable to resolve URL: ${url}`,
        LogContext.URL_RESOLVER,
        {
          message: error?.message,
          originalException: error,
        }
      );
    }
  }

  private getBaseRoute(urlPathRoot: string): UrlPathBase | undefined {
    return Object.values(UrlPathBase).includes(urlPathRoot as UrlPathBase)
      ? (urlPathRoot as UrlPathBase)
      : undefined;
  }

  private async resolveBaseRoute(
    result: UrlResolverQueryResults,
    baseRoute: UrlPathBase,
    pathElements: string[],
    url: string,
    agentInfo: AgentInfo
  ): Promise<UrlResolverQueryResults | never> {
    const urlPath = this.getPath(url);
    switch (baseRoute) {
      case UrlPathBase.HOME: {
        result.type = UrlType.HOME;
        return result;
      }
      case UrlPathBase.CREATE_SPACE: {
        result.type = UrlType.FLOW;
        return result;
      }
      case UrlPathBase.DOCS: {
        result.type = UrlType.DOCUMENTATION;
        return result;
      }
      case UrlPathBase.USER: {
        result.type = UrlType.USER;
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
        return result;
      }
      case UrlPathBase.VIRTUAL_CONTRIBUTOR: {
        result.type = UrlType.VIRTUAL_CONTRIBUTOR;
        return await this.populateVirtualContributorResult(
          result,
          urlPath,
          agentInfo
        );
      }
      case UrlPathBase.ORGANIZATION: {
        result.type = UrlType.ORGANIZATION;
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
        return result;
      }
      case UrlPathBase.ADMIN:
        return await this.populateAdminResult(result, urlPath);
      case UrlPathBase.INNOVATION_HUBS:
        return await this.populateInnovationHubResult(result, urlPath);
      case UrlPathBase.INNOVATION_LIBRARY:
        result.type = UrlType.INNOVATION_LIBRARY;
        return result;
      case UrlPathBase.DOCUMENTATION:
        result.type = UrlType.DOCUMENTATION;
        return result;
      case UrlPathBase.INNOVATION_PACKS:
        return await this.populateInnovationPackResult(result, urlPath);
      case UrlPathBase.SPACE_EXPLORER: {
        result.type = UrlType.SPACE_EXPLORER;
        return result;
      }
      case UrlPathBase.CONTRIBUTORS_EXPLORER: {
        result.type = UrlType.CONTRIBUTORS_EXPLORER;
        return result;
      }
      case UrlPathBase.FORUM: {
        result.type = UrlType.FORUM;
        if (pathElements[1] === UrlPathElement.DISCUSSION) {
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
    throw new ValidationException(
      `Unknown base route (${baseRoute}), from URL: ${url}`,
      LogContext.URL_RESOLVER
    );
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
    _urlPath: string
  ): Promise<UrlResolverQueryResults> {
    // Not yet needed
    result.type = UrlType.ADMIN;
    return Promise.resolve(result);
  }

  private async populateInnovationHubResult(
    result: UrlResolverQueryResults,
    urlPath: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.INNOVATION_HUB;
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

    const calendarMatch = this.spaceInternalPathMatcherCalendar(internalPath);
    if (calendarMatch) {
      return await this.populateSpaceInternalResultCalendar(
        calendarMatch,
        result
        // agentInfo
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
        calloutsSet: {
          id: calloutsSetId,
        },
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

  private async populateSpaceInternalResultCalendar(
    calendarMatch: any,
    result: UrlResolverQueryResults
    // agentInfo: AgentInfo
  ): Promise<UrlResolverQueryResults> {
    if (!result.space) {
      throw new ValidationException(
        `Space not provided when resolving path: ${result.type}`,
        LogContext.URL_RESOLVER
      );
    }
    if (!calendarMatch.params) {
      return result;
    }
    const params = calendarMatch.params as {
      calendarEventNameId?: string | string[];
      path?: string | string[];
    };

    const calendarEventNameId = this.getMatchedResultAsString(
      params.calendarEventNameId
    );

    const space = await this.spaceLookupService.getSpaceOrFail(
      result.space.id,
      {
        relations: {
          collaboration: {
            timeline: {
              calendar: {
                events: true,
              },
            },
          },
        },
      }
    );
    if (
      !space.collaboration ||
      !space.collaboration.timeline ||
      !space.collaboration.timeline.calendar ||
      !space.collaboration.timeline.calendar.events
    ) {
      throw new RelationshipNotFoundException(
        `Space ${space.id} does not have a calendar`,
        LogContext.URL_RESOLVER
      );
    }

    result.space.calendar = {
      id: space.collaboration.timeline.calendar.id,
    };
    if (calendarEventNameId) {
      const calendarEvent = space.collaboration.timeline.calendar.events.find(
        calendarEvent => calendarEvent.nameID === calendarEventNameId
      );
      if (!calendarEvent) {
        throw new ValidationException(
          `CalendarEvent ${calendarEventNameId} not found in Space ${space.id} Calendar ${space.collaboration.timeline.calendar.id}`,
          LogContext.URL_RESOLVER
        );
      }
      result.space.calendar.calendarEventId = calendarEvent.id;
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
