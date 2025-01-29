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

@Injectable()
export class UrlResolverService {
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
      type: UrlType.SPACE,
    };

    if (pathElements.length === 0) {
      throw new ValidationException(
        `Invalid URL: ${url}`,
        LogContext.URL_GENERATOR
      );
    }

    switch (pathElements[0]) {
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
    result.type = UrlType.SPACE;
    const space = await this.spaceLookupService.getSpaceByNameIdOrFail(
      pathElements[0],
      this.spaceRelations
    );
    result.space = this.createSpaceResult(space, pathElements.slice(1));

    if (pathElements.length === 2) {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        `resolving url ${url}`
      );
      return result;
    }

    if (pathElements.length > 2 && pathElements[1] === URL_PATHS.CHALLENGES) {
      const subspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          pathElements[2],
          space.id,
          this.spaceRelations
        );
      const parentSpaceID = space.id;
      result.space = this.createSpaceResult(subspace, pathElements.slice(3));
      result.space.parentSpaces.push(parentSpaceID);
    }
    if (
      pathElements.length > 4 &&
      pathElements[3] === URL_PATHS.OPPORTUNITIES
    ) {
      const subsubspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          pathElements[4],
          space.id,
          this.spaceRelations
        );

      const parentSpaceID = space.id;
      result.space = this.createSpaceResult(subsubspace, pathElements.slice(5));
      result.space.parentSpaces.push(parentSpaceID);
    }

    return await this.populateCollaborationResult(result);
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
    const spacePath = result.space.pathElements;
    if (spacePath.length === 0) {
      return result;
    }
    if (spacePath[0] === URL_PATHS.COLLABORATION) {
      if (spacePath.length >= 1) {
        const calloutNameID = spacePath[1];
        const callout = await this.entityManager.findOneOrFail(Callout, {
          where: {
            nameID: calloutNameID,
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
        if (spacePath.length >= 4) {
          if (spacePath[2] === URL_PATHS.POSTS) {
            const postNameID = spacePath[3];
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
              }
            );
            result.space.collaboration.contributionId = contribution.id;
            result.type = UrlType.CONTRIBUTION_POST;
            result.space.collaboration.postId = contribution?.post?.id;
          } else if (spacePath[2] === URL_PATHS.WHITEBOARDS) {
            const whiteboardNameID = spacePath[3];
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
              }
            );
            result.space.collaboration.contributionId = contribution.id;
            result.type = UrlType.CONTRIBUTION_WHITEBOARD;
            result.space.collaboration.whiteboardId =
              contribution?.whiteboard?.id;
          }
        }
      }
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
    pathElements: string[]
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
    const result: UrlResolverQueryResultSpace = {
      id: space.id,
      level: space.level,
      parentSpaces: [],
      collaboration: {
        id: space.collaboration.id,
        calloutsSetId: space.collaboration.calloutsSet?.id,
      },
      levelZeroSpaceID: space.levelZeroSpaceID,
      pathElements: pathElements,
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
