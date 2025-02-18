import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { Cache, CachingConfig } from 'cache-manager';
import { Space } from '@domain/space/space/space.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { AlkemioConfig } from '@src/types';
import { Template } from '@domain/template/template/template.entity';
import { InnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Community } from '@domain/community/community';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { UrlPathElement } from '@common/enums/url.path.element';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { UrlPathBase } from '@common/enums/url.path.base';

@Injectable()
export class UrlGeneratorService {
  cacheOptions: CachingConfig = {
    ttl: 1, // milliseconds
  };

  FIELD_PROFILE_ID = 'profileId';
  FIELD_ID = 'id';

  private endpoint_cluster: string;

  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    this.endpoint_cluster = this.configService.get('hosting.endpoint_cluster', {
      infer: true,
    });
  }

  private getUrlIdCacheKey(entityId: string): string {
    return `@url:communicationId:${entityId}`;
  }

  private async setUrlCache(entityId: string, url: string) {
    await this.cacheManager.set(
      this.getUrlIdCacheKey(entityId),
      url,
      this.cacheOptions
    );
  }

  public async revokeUrlCache(entityId: string): Promise<void> {
    await this.cacheManager.del(this.getUrlIdCacheKey(entityId));
  }

  public async getUrlFromCache(entityId: string): Promise<string | undefined> {
    const url = await this.cacheManager.get<string>(
      this.getUrlIdCacheKey(entityId)
    );
    if (url) {
      this.logger.verbose?.(
        `Using cached url for entity: ${url}`,
        LogContext.URL_GENERATOR
      );
    }
    return url;
  }

  async generateUrlForSubsubspace(subsubspaceID: string): Promise<string> {
    const cachedUrl = await this.getUrlFromCache(subsubspaceID);
    if (cachedUrl) {
      return cachedUrl;
    }
    const subsubspaceUrlPath = await this.getSubsubspaceUrlPath(
      this.FIELD_ID,
      subsubspaceID
    );
    if (!subsubspaceUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find subsubspace for ID: ${subsubspaceID}`,
        LogContext.URL_GENERATOR
      );
    }
    await this.setUrlCache(subsubspaceID, subsubspaceUrlPath);
    return subsubspaceUrlPath;
  }

  async generateUrlForSubspace(subspaceID: string): Promise<string> {
    const cachedUrl = await this.getUrlFromCache(subspaceID);
    if (cachedUrl) {
      return cachedUrl;
    }
    const subspaceUrlPath = await this.getSubspaceUrlPath(
      this.FIELD_ID,
      subspaceID
    );
    if (!subspaceUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find subspace for ID: ${subspaceID}`,
        LogContext.URL_GENERATOR
      );
    }
    await this.setUrlCache(subspaceID, subspaceUrlPath);
    return subspaceUrlPath;
  }

  public generateUrlForSpace(spaceNameID: string): string {
    return `${this.endpoint_cluster}/${spaceNameID}`;
  }

  private generateAdminUrlForSpace(spaceNameID: string): string {
    return `${this.endpoint_cluster}/${spaceNameID}/settings`;
  }

  async generateUrlForProfile(profile: IProfile): Promise<string> {
    const cachedUrl = await this.getUrlFromCache(profile.id);
    if (cachedUrl) {
      return cachedUrl;
    }
    const url = await this.generateUrlForProfileNotCached(profile);
    if (url && url.length > 0) {
      await this.setUrlCache(profile.id, url);
    }
    return url;
  }

  public generateUrlForVC(nameID: string): string {
    return `${this.endpoint_cluster}/vc/${nameID}`;
  }

  public generateUrlForPlatform(): string {
    return `${this.endpoint_cluster}/home`;
  }

  async createJourneyAdminCommunityURL(space: ISpace): Promise<string> {
    const spaceNameID = space.nameID;
    const baseURL = `${this.endpoint_cluster}/admin/spaces/${spaceNameID}`;
    switch (space.level) {
      case SpaceLevel.L0:
        const spaceAdminUrl = await this.generateAdminUrlForSpace(space.nameID);
        return `${spaceAdminUrl}/community`;
      case SpaceLevel.L1:
        const subspaceAdminUrl = await this.getSubspaceUrlPath(
          this.FIELD_ID,
          space.id,
          true
        );
        return `${subspaceAdminUrl}/community`;
      case SpaceLevel.L2:
        const subsubspaceAdminURL = await this.getSubsubspaceUrlPath(
          this.FIELD_ID,
          space.id,
          true
        );
        return `${subsubspaceAdminURL}/community`;
    }

    return baseURL;
  }

  private async generateUrlForProfileNotCached(
    profile: IProfile
  ): Promise<string> {
    const cachedUrl = await this.getUrlFromCache(profile.id);
    if (cachedUrl) {
      return cachedUrl;
    }
    switch (profile.type) {
      case ProfileType.SPACE:
        const spaceEntityInfo = await this.getNameableEntityInfoOrFail(
          'space',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return this.generateUrlForSpace(spaceEntityInfo.entityNameID);
      case ProfileType.CHALLENGE:
        const subspaceUrlPath = await this.getSubspaceUrlPath(
          this.FIELD_PROFILE_ID,
          profile.id
        );
        if (!subspaceUrlPath) {
          throw new EntityNotFoundException(
            `Unable to find subspace for profileId: ${profile.id}`,
            LogContext.URL_GENERATOR
          );
        }
        return subspaceUrlPath;
      case ProfileType.OPPORTUNITY:
        const subsubspaceUrlPath = await this.getSubsubspaceUrlPath(
          this.FIELD_PROFILE_ID,
          profile.id
        );
        if (!subsubspaceUrlPath) {
          throw new EntityNotFoundException(
            `Unable to find subsubspace for profileId: ${profile.id}`,
            LogContext.URL_GENERATOR
          );
        }
        return subsubspaceUrlPath;
      case ProfileType.USER:
        const userEntityInfo = await this.getNameableEntityInfoOrFail(
          'user',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return this.createUrlFoUserNameID(userEntityInfo.entityNameID);
      case ProfileType.VIRTUAL_CONTRIBUTOR:
        const vcEntityInfo = await this.getNameableEntityInfoOrFail(
          'virtual_contributor',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return `${this.endpoint_cluster}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/${vcEntityInfo.entityNameID}`;
      case ProfileType.ORGANIZATION:
        const organizationEntityInfo = await this.getNameableEntityInfoOrFail(
          'organization',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return this.createUrlForOrganizationNameID(
          organizationEntityInfo.entityNameID
        );
      case ProfileType.CALLOUT_FRAMING:
        return await this.getCalloutFramingUrlPathOrFail(profile.id);
      case ProfileType.COMMUNITY_GUIDELINES:
        return await this.getCommunityGuidelinesUrlPathOrFail(profile.id);
      case ProfileType.POST:
        return await this.getPostUrlPathByField(
          this.FIELD_PROFILE_ID,
          profile.id
        );
      case ProfileType.WHITEBOARD:
        return await this.getWhiteboardUrlPathByProfileID(profile.id);
      case ProfileType.INNOVATION_FLOW:
        return await this.getInnovationFlowUrlPathOrFail(profile.id);
      case ProfileType.TEMPLATE:
        return await this.getTemplateUrlPathOrFail(profile.id);
      case ProfileType.INNOVATION_PACK:
        return await this.getInnovationPackUrlPath(profile.id);
      case ProfileType.CALENDAR_EVENT:
        return await this.getCalendarEventUrlPathByField(
          this.FIELD_PROFILE_ID,
          profile.id
        );

      case ProfileType.DISCUSSION:
        return await this.getForumDiscussionUrlPathByField(
          this.FIELD_PROFILE_ID,
          profile.id
        );
      case ProfileType.INNOVATION_HUB:
        const innovationHubEntityInfo = await this.getNameableEntityInfoOrFail(
          'innovation_hub',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return `${this.endpoint_cluster}/innovation-hubs/${innovationHubEntityInfo.entityNameID}/settings`;
      case ProfileType.USER_GROUP:
        // to do: implement and decide what to do with user groups
        return `${this.endpoint_cluster}`;
      case ProfileType.KNOWLEDGE_BASE:
        const vc =
          await this.getVirtualContributorFromKnowledgeBaseProfileOrFail(
            profile.id
          );
        return `${this.endpoint_cluster}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/${vc.nameID}/${UrlPathElement.KNOWLEDGE_BASE}`;
    }
    return '';
  }

  public createUrlForContributor(contributor: IContributor): string {
    const type = this.getContributorType(contributor);
    let path: string = UrlPathBase.VIRTUAL_CONTRIBUTOR;
    switch (type) {
      case RoleSetContributorType.USER:
        path = UrlPathBase.USER;
        break;
      case RoleSetContributorType.ORGANIZATION:
        path = UrlPathBase.ORGANIZATION;
        break;
      case RoleSetContributorType.VIRTUAL:
        path = UrlPathBase.VIRTUAL_CONTRIBUTOR;
        break;
    }
    return `${this.endpoint_cluster}/${path}/${contributor.nameID}`;
  }

  public createUrlForOrganizationNameID(organizationNameID: string): string {
    return `${this.endpoint_cluster}/${UrlPathBase.ORGANIZATION}/${organizationNameID}`;
  }

  public createUrlFoUserNameID(userNameID: string): string {
    return `${this.endpoint_cluster}/${UrlPathBase.USER}/${userNameID}`;
  }

  private getContributorType(contributor: IContributor) {
    if (contributor instanceof User) return RoleSetContributorType.USER;
    if (contributor instanceof Organization)
      return RoleSetContributorType.ORGANIZATION;
    if (contributor instanceof VirtualContributor)
      return RoleSetContributorType.VIRTUAL;
    throw new RelationshipNotFoundException(
      `Unable to determine contributor type for ${contributor.id}`,
      LogContext.COMMUNITY
    );
  }

  public async getNameableEntityInfoOrFail(
    entityTableName: string,
    fieldName: string,
    fieldID: string
  ): Promise<{ entityNameID: string; entityID: string }> {
    const result = await this.getNameableEntityInfo(
      entityTableName,
      fieldName,
      fieldID
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find nameable parent on entity type '${entityTableName}' for '${fieldName}': ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }
    return result;
  }

  public async getNameableEntityInfo(
    entityTableName: string,
    fieldName: string,
    fieldID: string
  ): Promise<{ entityNameID: string; entityID: string } | null> {
    const [result]: {
      entityID: string;
      entityNameID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityTableName}\`.\`id\` as \`entityID\`, \`${entityTableName}\`.\`nameID\` as entityNameID FROM \`${entityTableName}\`
        WHERE \`${entityTableName}\`.\`${fieldName}\` = '${fieldID}'
      `
    );

    if (!result) {
      return null;
    }
    return result;
  }

  private async getTemplateUrlPathOrFail(profileID: string): Promise<string> {
    const template = await this.entityManager.findOne(Template, {
      where: {
        profile: {
          id: profileID,
        },
      },
      relations: {
        templatesSet: true,
      },
    });
    if (!template || !template.templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find template for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const templatesSetUrl = await this.getTemplatesSetUrlPathOrFail(
      template.templatesSet.id
    );
    return `${templatesSetUrl}/${template.nameID}`;
  }

  private async getTemplatesSetUrlPathOrFail(
    templatesSetID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        templatesManager: {
          templatesSet: {
            id: templatesSetID,
          },
        },
      },
    });

    if (space) {
      // TODO: this later should link fully to the actual template by nameID when the client properly picks that up
      return `${this.endpoint_cluster}/${space.nameID}/settings/templates`;
    }

    const innovationPack = await this.entityManager.findOne(InnovationPack, {
      where: {
        templatesSet: {
          id: templatesSetID,
        },
      },
    });
    if (!innovationPack) {
      throw new EntityNotFoundException(
        `Unable to find InnovationPack for TemplatesSet: ${templatesSetID}`,
        LogContext.URL_GENERATOR
      );
    }

    return `${this.endpoint_cluster}/${UrlPathBase.INNOVATION_PACKS}/${innovationPack.nameID}`;
  }

  private async getSpaceUrlPath(
    fieldName: string,
    fieldID: string,
    admin = false
  ): Promise<string | undefined> {
    const spaceInfo = await this.getNameableEntityInfo(
      'space',
      fieldName,
      fieldID
    );

    if (!spaceInfo) {
      return undefined;
    }

    if (!admin) {
      return this.generateUrlForSpace(spaceInfo.entityNameID);
    } else {
      return this.generateAdminUrlForSpace(spaceInfo.entityNameID);
    }
  }

  private async getSubspaceUrlPath(
    fieldName: string,
    fieldID: string,
    admin = false
  ): Promise<string | undefined> {
    const [result]: {
      subspaceId: string;
      subspaceNameId: string;
      spaceId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT space.id as subspaceId, space.nameID as subspaceNameId, space.parentSpaceId as spaceId FROM space
        WHERE space.${fieldName} = '${fieldID}'
      `
    );

    if (!result || !result.spaceId) {
      return undefined;
    }

    const spaceUrlPath = await this.getSpaceUrlPath(
      this.FIELD_ID,
      result.spaceId,
      admin
    );
    if (!spaceUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find space for ${fieldName}: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }
    return `${spaceUrlPath}/challenges/${result.subspaceNameId}`;
  }

  private async getSubsubspaceUrlPath(
    fieldName: string,
    fieldID: string,
    admin = false
  ): Promise<string | undefined> {
    const [result]: {
      subsubspaceId: string;
      subsubspaceNameId: string;
      subspaceId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT space.id as subsubspaceId, space.nameID as subsubspaceNameId, space.parentSpaceId as subspaceId FROM space
        WHERE space.${fieldName} = '${fieldID}'
      `
    );

    if (!result || !result.subspaceId) {
      return undefined;
    }

    const subspaceUrlPath = await this.getSubspaceUrlPath(
      this.FIELD_ID,
      result.subspaceId,
      admin
    );

    if (!subspaceUrlPath) return undefined;

    return `${subspaceUrlPath}/opportunities/${result.subsubspaceNameId}`;
  }

  private async getInnovationFlowUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    const innovationFlow = await this.entityManager.findOne(InnovationFlow, {
      where: {
        profile: {
          id: profileID,
        },
      },
    });

    if (!innovationFlow) {
      throw new EntityNotFoundException(
        `Unable to find innovationFlow for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        innovationFlow: {
          id: innovationFlow.id,
        },
      },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find innovationFlow for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    if (collaboration.isTemplate) {
      return this.getCollaborationTemplateUrlPathOrFail(collaboration.id);
    }

    return this.getJourneyUrlPath('collaborationId', collaboration.id);
  }

  private async getCollaborationTemplateUrlPathOrFail(collaborationId: string) {
    const template = await this.entityManager.findOne(Template, {
      where: {
        collaboration: {
          id: collaborationId,
        },
      },
      relations: {
        profile: true,
      },
    });

    if (!template || !template.profile) {
      throw new EntityNotFoundException(
        `Unable to find collaboration template for collaboration: ${collaborationId}`,
        LogContext.URL_GENERATOR
      );
    }

    return this.getTemplateUrlPathOrFail(template.profile.id);
  }

  private async getCommunityGuidelinesUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    const communityGuidelines = await this.entityManager.findOne(
      CommunityGuidelines,
      {
        where: {
          profile: {
            id: profileID,
          },
        },
      }
    );

    if (!communityGuidelines) {
      throw new EntityNotFoundException(
        `Unable to find community guidelines for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    const community = await this.entityManager.findOne(Community, {
      where: {
        guidelines: {
          id: communityGuidelines.id,
        },
      },
    });
    if (community) {
      return await this.getJourneyUrlPath('communityId', community.id);
    }

    const template = await this.entityManager.findOne(Template, {
      where: {
        communityGuidelines: {
          id: communityGuidelines.id,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (template) {
      return await this.getTemplateUrlPathOrFail(template.profile.id);
    }
    throw new EntityNotFoundException(
      `Unable to find community guidelines for profile: ${profileID}, communityguidelines: ${communityGuidelines.id}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getCalloutFramingUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    const callout = await this.entityManager.findOne(Callout, {
      where: {
        framing: {
          profile: {
            id: profileID,
          },
        },
      },
    });
    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to find Callout with Framing with profile ID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return await this.getCalloutUrlPath(callout.id);
  }

  public async getCalloutUrlPath(calloutID: string): Promise<string> {
    const callout = await this.entityManager.findOne(Callout, {
      where: {
        id: calloutID,
      },
      relations: {
        calloutsSet: true,
      },
    });

    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to find callout where id: ${calloutID}`,
        LogContext.URL_GENERATOR
      );
    }

    if (callout.calloutsSet) {
      if (callout.calloutsSet.type === CalloutsSetType.COLLABORATION) {
        const collaboration = await this.entityManager.findOne(Collaboration, {
          where: {
            calloutsSet: {
              id: callout.calloutsSet.id,
            },
          },
        });
        if (!collaboration) {
          throw new EntityNotFoundException(
            `Unable to find collaboration for callouts set where id: ${callout.calloutsSet.id}`,
            LogContext.URL_GENERATOR
          );
        }

        if (collaboration.isTemplate) {
          return this.getCollaborationTemplateUrlPathOrFail(collaboration.id);
        }

        const collaborationJourneyUrlPath = await this.getJourneyUrlPath(
          'collaborationId',
          collaboration.id
        );
        return `${collaborationJourneyUrlPath}/${UrlPathElement.COLLABORATION}/${callout.nameID}`;
      } else if (callout.calloutsSet.type === CalloutsSetType.KNOWLEDGE_BASE) {
        const virtualContributor = await this.entityManager.findOne(
          VirtualContributor,
          {
            where: {
              knowledgeBase: {
                calloutsSet: {
                  id: callout.calloutsSet.id,
                },
              },
            },
          }
        );
        if (!virtualContributor) {
          throw new EntityNotFoundException(
            `Unable to find virtual contributor for callouts set where id: ${callout.calloutsSet.id}`,
            LogContext.URL_GENERATOR
          );
        }
        const vcUrl = await this.generateUrlForVC(virtualContributor.nameID);
        return `${vcUrl}/${UrlPathElement.KNOWLEDGE_BASE}/${callout.nameID}`;
      }
    }

    const template = await this.entityManager.findOne(Template, {
      where: {
        callout: {
          id: callout.id,
        },
      },
      relations: {
        profile: true,
        templatesSet: true,
      },
    });
    if (!template || !template.templatesSet || !template.profile) {
      throw new EntityNotFoundException(
        `Unable to find template info for Callout that was not in a Collaboration: ${callout.id}`,
        LogContext.URL_GENERATOR
      );
    }
    return await this.getTemplateUrlPathOrFail(template.profile.id);
  }

  private async getJourneyUrlPath(
    fieldName: string,
    fieldID: string
  ): Promise<string> {
    if (!fieldID || fieldID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find journey with ${fieldName}: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }
    let collaborationJourneyUrlPath = await this.getSubsubspaceUrlPath(
      fieldName,
      fieldID
    );
    if (!collaborationJourneyUrlPath) {
      collaborationJourneyUrlPath = await this.getSubspaceUrlPath(
        fieldName,
        fieldID
      );
    }
    if (!collaborationJourneyUrlPath) {
      collaborationJourneyUrlPath = await this.getSpaceUrlPath(
        fieldName,
        fieldID
      );
    }
    if (!collaborationJourneyUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find url path for collaboration: ${fieldName} - ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }
    return collaborationJourneyUrlPath;
  }

  public async getPostUrlPath(calloutID: string): Promise<string> {
    return await this.getPostUrlPathByField(this.FIELD_ID, calloutID);
  }

  private async getPostUrlPathByField(
    fieldName: string,
    fieldID: string
  ): Promise<string> {
    const [result]: {
      postId: string;
      postNameId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT post.id as postId, post.nameID as postNameId FROM post
        WHERE post.${fieldName} = '${fieldID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find post where profile: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }

    const contribution = await this.entityManager.findOne(CalloutContribution, {
      where: {
        post: {
          id: result.postId,
        },
      },
      relations: {
        callout: true,
        post: true,
      },
    });

    if (!contribution || !contribution.callout) {
      throw new EntityNotFoundException(
        `Unable to contribution callout for post where postID: ${result.postId}`,
        LogContext.URL_GENERATOR
      );
    }

    const calloutUrlPath = await this.getCalloutUrlPath(
      contribution.callout.id
    );
    return `${calloutUrlPath}/${UrlPathElement.POSTS}/${result.postNameId}`;
  }

  private async getWhiteboardUrlPathByProfileID(
    whiteboardProfileID: string
  ): Promise<string> {
    const whiteboard = await this.entityManager.findOne(Whiteboard, {
      where: {
        profile: {
          id: whiteboardProfileID,
        },
      },
      select: {
        id: true,
        nameID: true,
      },
    });

    if (!whiteboard) {
      throw new EntityNotFoundException(
        `Unable to find whiteboard where profile: ${whiteboardProfileID}`,
        LogContext.URL_GENERATOR
      );
    }

    return await this.getWhiteboardUrlPath(whiteboard.id, whiteboard.nameID);
  }

  public async getWhiteboardUrlPath(
    whiteboardID: string,
    whiteboardNameID: string
  ): Promise<string> {
    let callout = await this.entityManager.findOne(Callout, {
      where: {
        framing: {
          whiteboard: {
            id: whiteboardID,
          },
        },
      },
    });
    if (!callout) {
      callout = await this.entityManager.findOne(Callout, {
        where: {
          contributions: {
            whiteboard: {
              id: whiteboardID,
            },
          },
        },
      });
    }
    if (callout) {
      const calloutUrlPath = await this.getCalloutUrlPath(callout.id);
      return `${calloutUrlPath}/${UrlPathElement.WHITEBOARDS}/${whiteboardNameID}`;
    }
    if (!callout) {
      // Whiteboard can be also a direct template
      const template = await this.entityManager.findOne(Template, {
        where: {
          whiteboard: {
            id: whiteboardID,
          },
        },
        relations: {
          profile: true,
        },
      });
      if (template) {
        return await this.getTemplateUrlPathOrFail(template.profile.id);
      }
    }

    throw new EntityNotFoundException(
      `Unable to find url for whiteboardId: ${whiteboardID}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getInnovationPackUrlPath(profileID: string): Promise<string> {
    const innovationPackInfo = await this.getNameableEntityInfoOrFail(
      'innovation_pack',
      this.FIELD_PROFILE_ID,
      profileID
    );
    return `${this.endpoint_cluster}/${UrlPathBase.INNOVATION_PACKS}/${innovationPackInfo.entityNameID}`;
  }

  public async getForumDiscussionUrlPath(
    forumDiscussionID: string
  ): Promise<string> {
    return await this.getForumDiscussionUrlPathByField(
      this.FIELD_ID,
      forumDiscussionID
    );
  }

  private async getForumDiscussionUrlPathByField(
    fieldName: string,
    fieldID: string
  ): Promise<string> {
    const discussionEntityInfo = await this.getNameableEntityInfoOrFail(
      'discussion',
      fieldName,
      fieldID
    );
    return `${this.endpoint_cluster}/forum/discussion/${discussionEntityInfo.entityNameID}`;
  }

  public async getCalendarEventUrlPath(
    calendarEventID: string
  ): Promise<string> {
    return await this.getCalendarEventUrlPathByField(
      this.FIELD_ID,
      calendarEventID
    );
  }

  private async getCalendarEventUrlPathByField(
    fieldName: string,
    fieldID: string
  ): Promise<string> {
    const [calendarEventInfo]: {
      entityID: string;
      entityNameID: string;
      calendarID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT calendar_event.id as entityID, calendar_event.nameID as entityNameID, calendar_event.calendarId as calendarID FROM calendar_event
        WHERE calendar_event.${fieldName} = '${fieldID}'
      `
    );

    if (!calendarEventInfo) {
      throw new EntityNotFoundException(
        `Unable to find calendar event where profile: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }

    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        timeline: {
          calendar: {
            id: calendarEventInfo.calendarID,
          },
        },
      },
    });

    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find collaboration timeline with calendar: ${calendarEventInfo.calendarID}`,
        LogContext.URL_GENERATOR
      );
    }

    const journeyUrlPath = await this.getJourneyUrlPath(
      'collaborationId',
      collaboration.id
    );
    return `${journeyUrlPath}/${UrlPathElement.CALENDAR}/${calendarEventInfo.entityNameID}`;
  }

  private async getVirtualContributorFromKnowledgeBaseProfileOrFail(
    kbProfileId: string
  ) {
    const vc = await this.entityManager.findOne(VirtualContributor, {
      where: {
        knowledgeBase: {
          profile: { id: kbProfileId },
        },
      },
    });

    if (!vc) {
      throw new EntityNotFoundException(
        `Unable to find VirtualContributor for KnowledgeBase with profile ID: ${kbProfileId}`,
        LogContext.URL_GENERATOR
      );
    }
    return vc;
  }
}
