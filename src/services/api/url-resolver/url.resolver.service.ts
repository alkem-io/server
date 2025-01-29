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

    const result: UrlResolverQueryResults = {};

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
        throw new ValidationException(
          `Invalid URL: ${url}`,
          LogContext.URL_GENERATOR
        );
    }
    const spaceRelations = {
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

    // Know it is a space URL
    const space = await this.spaceLookupService.getSpaceByNameIdOrFail(
      pathElements[0],
      spaceRelations
    );
    result.spaceId = space.id;
    result.type = UrlType.SPACE;

    let subspace: ISpace | null;
    let subsubspace: ISpace | null;
    if (pathElements.length === 2) {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        `resolving url ${url}`
      );
      result.spaceId = space.id;
      return result;
    }

    let spaceForPath: ISpace = space;
    let spacePath: string[] = pathElements.slice(1);
    if (pathElements.length > 2 && pathElements[1] === URL_PATHS.CHALLENGES) {
      subspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          pathElements[2],
          space.id,
          spaceRelations
        );
      if (!subspace) {
        throw new ValidationException(
          `Invalid URL: ${url}`,
          LogContext.URL_GENERATOR
        );
      }
      spaceForPath = subspace;
      spacePath = pathElements.splice(3);
      result.subspaceId = subspace.id;
    }
    if (
      pathElements.length > 4 &&
      pathElements[3] === URL_PATHS.OPPORTUNITIES
    ) {
      subsubspace =
        await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
          pathElements[4],
          space.id,
          spaceRelations
        );
      if (!subsubspace) {
        throw new ValidationException(
          `Invalid URL: ${url}`,
          LogContext.URL_GENERATOR
        );
      }
      spaceForPath = subsubspace;
      spacePath = pathElements.splice(5);
      result.subsubspaceId = subsubspace.id;
    }

    // Set the internal fields based on the spaceForPath
    result.collaborationId = spaceForPath.collaboration?.id;
    result.calloutsSetId = spaceForPath.collaboration?.calloutsSet?.id;

    // Now lets process inside the space
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
        result.calloutId = callout.id;
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
            result.contributionId = contribution.id;
            result.type = UrlType.CONTRIBUTION_POST;
            result.postId = contribution?.post?.id;
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
            result.contributionId = contribution.id;
            result.type = UrlType.CONTRIBUTION_WHITEBOARD;
            result.whiteboardId = contribution?.whiteboard?.id;
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
}
