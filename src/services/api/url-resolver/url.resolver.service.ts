import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import { ValidationException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { URL_PATHS } from '@common/constants/url.path.constants';
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
import { UrlParser } from 'url-params-parser';

@Injectable()
export class UrlResolverService {
  private SPACE_URL = ':spaceNameId/:spacePath';
  private SUBSPACE_URL = `:spaceNameId/${URL_PATHS.CHALLENGES}/:subspaceNameId/:spacePath`;
  private SUBSUBSPACE_URL = `:spaceNameId/${URL_PATHS.CHALLENGES}/:subspaceNameId/${URL_PATHS.OPPORTUNITIES}/:subsubspaceNameId/:spacePath`;
  private COLLABORATION_URL_CALLOUT = `${URL_PATHS.COLLABORATION}/:calloutNameId`;
  private COLLABORATION_URL_CALLOUT_WHITEBOARD_CONTRIBUTION = `${this.COLLABORATION_URL_CALLOUT}/${URL_PATHS.WHITEBOARDS}/:whiteboardNameId`;
  private COLLABORATION_URL_CALLOUT_POST_CONTRIBUTION = `${this.COLLABORATION_URL_CALLOUT}/${URL_PATHS.POSTS}/:postNameId`;

  constructor(
    private authorizationService: AuthorizationService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
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
      case URL_PATHS.FORUM:
        result.type = UrlType.FORUM;
        return result;
    }

    // Assumption is that everything else is a Space!
    await this.populateSpaceResult(result, agentInfo, url);

    return await this.populateCollaborationResult(result);
  }

  private async populateSpaceResult(
    result: UrlResolverQueryResults,
    agentInfo: AgentInfo,
    url: string
  ): Promise<UrlResolverQueryResults> {
    result.type = UrlType.SPACE;
    const spacePathParams = this.parseUrl(url, this.SPACE_URL);
    if (!spacePathParams || !spacePathParams.spaceNameId) {
      throw new ValidationException(
        `Invalid URL: ${url}`,
        LogContext.URL_GENERATOR
      );
    }

    const space = await this.spaceLookupService.getSpaceByNameIdOrFail(
      spacePathParams.spaceNameId,
      this.spaceRelations
    );
    result.space = this.createSpaceResult(space, agentInfo, url);

    if (spacePathParams.subspaceNameId) {
      const subspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          spacePathParams.subspaceNameId,
          space.id,
          this.spaceRelations
        );
      const parentSpaceID = space.id;
      result.space = this.createSpaceResult(subspace, agentInfo, url);
      result.space.parentSpaces.push(parentSpaceID);
    }
    if (spacePathParams.subsubspaceNameId) {
      const subsubspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          spacePathParams.subsubspaceNameId,
          space.id,
          this.spaceRelations
        );

      const parentSpaceID = space.id;
      result.space = this.createSpaceResult(subsubspace, agentInfo, url);
      result.space.parentSpaces.push(parentSpaceID);
    }
    return result;
  }

  private createPathFromElements(pathElements: string[]): string {
    // Note: any domain works, we just need a valid URL base
    return 'https://alkem.io/' + pathElements.join('/');
  }

  private parseUrl(
    url: string,
    route: string
  ): Record<string, string> | undefined {
    const result = UrlParser(url, route);
    if (result) {
      return result.namedParams;
    }
    return undefined;
  }

  private async populateCollaborationResult(
    result: UrlResolverQueryResults
  ): Promise<UrlResolverQueryResults> {
    if (!result.space) {
      throw new ValidationException(
        `Space not provided: ${result.type}`,
        LogContext.URL_GENERATOR
      );
    }

    const pathElements: string[] = [];
    const spacePath = this.createPathFromElements(pathElements);
    const spacePathParams = this.parseUrl(
      spacePath,
      this.COLLABORATION_URL_CALLOUT
    );
    if (!spacePathParams || !spacePathParams.calloutNameId) {
      return result;
    }
    const calloutParam = spacePathParams.calloutNameId;

    // Assume have a callout
    const callout = await this.entityManager.findOneOrFail(Callout, {
      where: {
        nameID: calloutParam,
      },
      relations: {
        contributions: {
          post: true,
          whiteboard: true,
        },
      },
    });
    result.space.collaboration.calloutId = callout.id;
    result.type = UrlType.CALLOUT;

    // Check for post contribution
    const postContributionParams = this.parseUrl(
      spacePath,
      this.COLLABORATION_URL_CALLOUT_POST_CONTRIBUTION
    );
    if (postContributionParams && postContributionParams.postNameId) {
      const contribution = await this.entityManager.findOneOrFail(
        CalloutContribution,
        {
          where: {
            callout: {
              id: callout.id,
            },
            post: {
              nameID: postContributionParams.postNameId,
            },
          },
        }
      );
      result.space.collaboration.contributionId = contribution.id;
      result.type = UrlType.CONTRIBUTION_POST;
      result.space.collaboration.postId = contribution?.post?.id;
      return result;
    }

    // Check for whiteboard contribution
    const whiteboardContributionParams = this.parseUrl(
      spacePath,
      this.COLLABORATION_URL_CALLOUT_WHITEBOARD_CONTRIBUTION
    );
    if (
      whiteboardContributionParams &&
      whiteboardContributionParams.whiteboardNameId
    ) {
      const contribution = await this.entityManager.findOneOrFail(
        CalloutContribution,
        {
          where: {
            callout: {
              id: callout.id,
            },
            whiteboard: {
              nameID: whiteboardContributionParams.whiteboardNameId,
            },
          },
        }
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

  private createSpaceResult(
    space: ISpace | null,
    agentInfo: AgentInfo,
    url: string
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
