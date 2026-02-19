import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { UrlPathBase } from '@common/enums/url.path.base';
import { UrlPathElement } from '@common/enums/url.path.element';
import { UrlType } from '@common/enums/url.type';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ForumDiscussionLookupService } from '@platform/forum-discussion-lookup/forum.discussion.lookup.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, EntityNotFoundError } from 'typeorm';
import { UrlResolverQueryResultCalloutsSet } from './dto/url.resolver.query.callouts.set.result';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import { UrlResolverQueryResultSpace } from './dto/url.resolver.query.space.result';
import { UrlResolverResultState } from './dto/url.resolver.result.state';
import { UrlResolverException } from './url.resolver.exception';
import * as Utils from './url.resolver.utils';

@Injectable()
export class UrlResolverService {
  constructor(
    private authorizationService: AuthorizationService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private forumDiscussionLookupService: ForumDiscussionLookupService,
    private virtualActorLookupService: VirtualActorLookupService,
    private spaceLookupService: SpaceLookupService,
    private innovationPackService: InnovationPackService,
    private innovationHubService: InnovationHubService,
    private urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async resolveUrl(
    url: string,
    actorContext: ActorContext
  ): Promise<UrlResolverQueryResults> {
    const pathElements = Utils.getPathElements(url);

    const result: UrlResolverQueryResults = {
      type: UrlType.UNKNOWN,
      state: UrlResolverResultState.Resolved,
    };

    if (pathElements.length === 0) {
      result.type = UrlType.HOME;
      return result;
    }

    const urlPathBase = pathElements[0];
    const urlPath = Utils.getPath(url);

    // First check for reserved top level base routes
    const baseRoute = this.getBaseRoute(urlPathBase);
    if (baseRoute) {
      try {
        return await this.resolveBaseRoute(
          result,
          baseRoute,
          pathElements,
          url,
          actorContext
        );
      } catch (error: any) {
        return await this.handleException(error, url, result);
      }
    }

    // Assumption is that everything else is a Space!
    try {
      await this.populateSpaceResult(result, actorContext, urlPath);
      return await this.populateSpaceInternalResult(result, actorContext);
    } catch (error: any) {
      return await this.handleException(error, url, result);
    }
  }

  private async handleException(
    error: any,
    url: string,
    result: UrlResolverQueryResults
  ): Promise<UrlResolverQueryResults> {
    if (
      error instanceof EntityNotFoundException ||
      error instanceof RelationshipNotFoundException ||
      error instanceof ValidationException ||
      error instanceof EntityNotFoundError // TypeORM couldn't find the entity
    ) {
      result.state = UrlResolverResultState.NotFound;
      await this.populateClosestAncestor(result);
      return result;
    }
    if (
      error instanceof ForbiddenException ||
      error instanceof ForbiddenAuthorizationPolicyException
    ) {
      result.state = UrlResolverResultState.Forbidden;
      await this.populateClosestAncestor(result);
      return result;
    }

    throw new UrlResolverException(
      'Unable to resolve URL',
      LogContext.URL_RESOLVER,
      {
        message: error?.message,
        originalException: error,
        url,
      }
    );
  }

  private async populateClosestAncestor(result: UrlResolverQueryResults) {
    // Default to HOME if nothing else is found
    result.closestAncestor = {
      type: UrlType.HOME,
      url: this.urlGeneratorService.generateUrlForPlatform(),
    };

    // If we have a space, that's a better ancestor
    if (result.space) {
      try {
        const url = await this.urlGeneratorService.getSpaceUrlPathByID(
          result.space.id
        );
        result.closestAncestor = {
          type: UrlType.SPACE,
          url: url,
          space: result.space,
        };
      } catch (e) {
        this.logger.warn?.(
          'Failed to generate URL for closest ancestor space',
          LogContext.URL_RESOLVER,
          { error: e, spaceId: result.space.id }
        );
      }
    }

    // If we have a virtual contributor, that's also a good ancestor
    if (result.virtualContributor) {
      try {
        const url = await this.urlGeneratorService.generateUrlForVCById(
          result.virtualContributor.id
        );
        result.closestAncestor = {
          type: UrlType.VIRTUAL_CONTRIBUTOR,
          url: url,
          virtualContributor: result.virtualContributor,
        };
      } catch (e) {
        this.logger.warn?.(
          'Failed to generate URL for closest ancestor virtual contributor',
          LogContext.URL_RESOLVER,
          { error: e, vcId: result.virtualContributor.id }
        );
      }
    }

    // Clean up partial results if we are in an error state
    if (result.state !== UrlResolverResultState.Resolved) {
      delete result.space;
      delete result.virtualContributor;
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
    actorContext: ActorContext
  ): Promise<UrlResolverQueryResults> {
    const urlPath = Utils.getPath(url);
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
          actorContext
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
      case UrlPathBase.HUB:
        return await this.populateHubResult(result, urlPath);
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
      case UrlPathBase.LOGIN: {
        result.type = UrlType.LOGIN;
        return result;
      }
      case UrlPathBase.LOGOUT: {
        result.type = UrlType.LOGOUT;
        return result;
      }
      case UrlPathBase.REGISTRATION: {
        result.type = UrlType.REGISTRATION;
        return result;
      }
      case UrlPathBase.SIGN_UP: {
        result.type = UrlType.SIGN_UP;
        return result;
      }
      case UrlPathBase.VERIFY: {
        result.type = UrlType.VERIFY;
        return result;
      }
      case UrlPathBase.RECOVERY: {
        result.type = UrlType.RECOVERY;
        return result;
      }
      case UrlPathBase.REQUIRED: {
        result.type = UrlType.REQUIRED;
        return result;
      }
      case UrlPathBase.RESTRICTED: {
        result.type = UrlType.RESTRICTED;
        return result;
      }
      case UrlPathBase.ERROR: {
        result.type = UrlType.ERROR;
        return result;
      }
    }
    throw new ValidationException(
      'Unknown base route',
      LogContext.URL_RESOLVER,
      {
        baseRoute,
        url,
      }
    );
  }

  private async populateVirtualContributorResult(
    result: UrlResolverQueryResults,
    urlPath: string,
    actorContext: ActorContext
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.VIRTUAL_CONTRIBUTOR;
    const virtualContributorMatch =
      Utils.virtualContributorPathMatcher(urlPath);
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
      memoNameID?: string | string[];
      path?: string | string[];
    };

    const virtualContributorNameID = Utils.getMatchedResultAsString(
      params.virtualContributorNameID
    );
    const calloutNameID = Utils.getMatchedResultAsString(params.calloutNameID);
    const postNameID = Utils.getMatchedResultAsString(params.postNameID);
    const memoNameID = Utils.getMatchedResultAsString(params.memoNameID);

    if (!virtualContributorNameID) {
      throw new ValidationException(
        `Invalid URL, unable to retrieve virtual contributor identifier: ${urlPath}`,
        LogContext.URL_RESOLVER
      );
    }

    const virtualContributor =
      await this.virtualActorLookupService.getVirtualContributorByNameIdOrFail(
        virtualContributorNameID,
        {
          relations: {
            knowledgeBase: {
              calloutsSet: {
                callouts: {
                  contributions: {
                    post: true,
                    whiteboard: true,
                    memo: true,
                  },
                },
              },
            },
          },
        }
      );

    // Set the VC result immediately so it can be used as an ancestor if subsequent checks fail
    result.virtualContributor = {
      id: virtualContributor.id,
      // This empty object will never be returned
      // If resolution succeeds, we will overwrite it.
      // If resolution fails, handleException will use this partial object to calculate closestAncestor
      // and then remove it from the final result.
      calloutsSet: {
        id: '',
        type: UrlType.CALLOUTS_SET,
      },
    };

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
      actorContext,
      urlPath,
      calloutNameID,
      postNameID,
      undefined,
      memoNameID
    );

    result.virtualContributor.calloutsSet = calloutsSetResult;

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
    const innovationHubMatch = Utils.innovationHubPathMatcher(urlPath);
    if (!innovationHubMatch || !innovationHubMatch.params) {
      return result;
    }
    const params = innovationHubMatch.params as {
      innovationHubNameID?: string | string[];
      path?: string | string[];
    };

    const innovationHubNameID = Utils.getMatchedResultAsString(
      params.innovationHubNameID
    );

    if (!innovationHubNameID) {
      throw new ValidationException(
        'Unable to resolve innovation hub from URL',
        LogContext.URL_RESOLVER,
        {
          urlPath,
        }
      );
    }

    const innovationHub =
      await this.innovationHubService.getInnovationHubByNameIdOrFail(
        innovationHubNameID
      );
    result.innovationHubId = innovationHub.id;

    return result;
  }

  private async populateHubResult(
    result: UrlResolverQueryResults,
    urlPath: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.INNOVATION_HUB;
    const hubMatch = Utils.hubPathMatcher(urlPath);
    if (!hubMatch || !hubMatch.params) {
      throw new ValidationException('Invalid URL', LogContext.URL_RESOLVER, {
        urlPath,
      });
    }
    const params = hubMatch.params as {
      innovationHubNameID?: string | string[];
      path?: string | string[];
    };

    const innovationHubNameID = Utils.getMatchedResultAsString(
      params.innovationHubNameID
    );

    if (!innovationHubNameID) {
      throw new ValidationException(
        'Unable to resolve innovation hub from URL',
        LogContext.URL_RESOLVER,
        { urlPath }
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
    const innovationPackMatch = Utils.innovationPackPathMatcher(urlPath);
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

    const innovationPackNameID = Utils.getMatchedResultAsString(
      params.innovationPackNameID
    );
    const templateNameID = Utils.getMatchedResultAsString(
      params.templateNameID
    );

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

  private async populateSpaceResult(
    result: UrlResolverQueryResults,
    actorContext: ActorContext,
    url: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.SPACE;
    const spacePathMatch = Utils.spacePathMatcher(url);
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

    const spaceNameID = Utils.getMatchedResultAsString(params.spaceNameID);
    const subspaceNameID = Utils.getMatchedResultAsString(
      params.challengeNameID
    );
    const subsubspaceNameID = Utils.getMatchedResultAsString(
      params.opportunityNameID
    );
    const spaceInternalPath = Utils.getMatchedResultAsPath(params.path);

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
      actorContext,
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
        actorContext,
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
        actorContext,
        url,
        spaceInternalPath
      );
      result.space.parentSpaces = parentSpaces;
    }
    return result;
  }

  private async populateSpaceInternalResult(
    result: UrlResolverQueryResults,
    actorContext: ActorContext
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
      Utils.spaceInternalPathMatcherCollaboration(internalPath);
    if (collaborationMatch) {
      return await this.populateSpaceInternalResultCollaboration(
        collaborationMatch,
        result,
        actorContext,
        internalPath
      );
    }

    const calendarMatch = Utils.spaceInternalPathMatcherCalendar(internalPath);
    if (calendarMatch) {
      return await this.populateSpaceInternalResultCalendar(
        calendarMatch,
        result
        // actorContext
      );
    }

    // Try a settings match
    const settingsMatch = Utils.spaceInternalPathMatcherSettings(internalPath);
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

    const templateNameID = Utils.getMatchedResultAsString(
      params.templateNameID
    );

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
    actorContext: ActorContext,
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
      memoNameID?: string | string[];
      path?: string | string[];
    };

    const calloutNameID = Utils.getMatchedResultAsString(params.calloutNameID);
    const postNameID = Utils.getMatchedResultAsString(params.postNameID);
    const whiteboardNameID = Utils.getMatchedResultAsString(
      params.whiteboardNameID
    );
    const memoNameID = Utils.getMatchedResultAsString(params.memoNameID);
    const collaborationInternalPath = Utils.getMatchedResultAsPath(params.path);
    const calloutsSetResult = await this.populateCalloutsSetResult(
      result.space.collaboration.calloutsSet.id,
      actorContext,
      collaborationInternalPath || internalPath,
      calloutNameID,
      postNameID,
      whiteboardNameID,
      memoNameID
    );

    result.space.collaboration.calloutsSet = calloutsSetResult;

    return result;
  }

  private async populateCalloutsSetResult(
    calloutsSetId: string,
    actorContext: ActorContext,
    urlPath: string,
    calloutNameID: string | undefined,
    postNameID: string | undefined,
    whiteboardNameID: string | undefined,
    memoNameID: string | undefined
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
          memo: true,
        },
      },
    });
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `resolving url for callout ${urlPath}`
    );
    result.calloutId = callout.id;
    result.type = UrlType.CALLOUT;
    if (!postNameID && !whiteboardNameID && !memoNameID) {
      return result;
    }

    // Check for post contribution
    if (postNameID) {
      const contribution = await this.entityManager.findOne(
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
      if (!contribution) {
        // Do not throw an error but return what is available
        return result;
      }
      this.authorizationService.grantAccessOrFail(
        actorContext,
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
      const contribution = await this.entityManager.findOne(
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
      if (!contribution) {
        // Do not throw an error but return what is available
        return result;
      }

      this.authorizationService.grantAccessOrFail(
        actorContext,
        contribution.authorization,
        AuthorizationPrivilege.READ,
        `resolving url for whiteboard on callout ${urlPath}`
      );
      result.contributionId = contribution.id;
      result.whiteboardId = contribution?.whiteboard?.id;
      result.type = UrlType.CONTRIBUTION_WHITEBOARD;
      return result;
    }

    // Check for memo contribution
    if (memoNameID) {
      const contribution = await this.entityManager.findOne(
        CalloutContribution,
        {
          where: {
            callout: {
              id: callout.id,
            },
            memo: {
              nameID: memoNameID,
            },
          },
          relations: {
            authorization: true,
            memo: true,
          },
        }
      );
      if (!contribution) {
        // Do not throw an error but return what is available
        return result;
      }

      this.authorizationService.grantAccessOrFail(
        actorContext,
        contribution.authorization,
        AuthorizationPrivilege.READ,
        `resolving url for memo on callout ${urlPath}`
      );
      result.contributionId = contribution.id;
      result.memoId = contribution?.memo?.id;
      result.type = UrlType.CONTRIBUTION_MEMO;
      return result;
    }

    return result;
  }

  private async populateSpaceInternalResultCalendar(
    calendarMatch: any,
    result: UrlResolverQueryResults
    // actorContext: ActorContext
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

    const calendarEventNameId = Utils.getMatchedResultAsString(
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

  private createSpaceResult(
    space: ISpace | null,
    actorContext: ActorContext,
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
      actorContext,
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
