import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOptionsWhere } from 'typeorm';
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
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { UrlPathElement } from '@common/enums/url.path.element';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { UrlPathBase } from '@common/enums/url.path.base';
import { UrlGeneratorCacheService } from './url.generator.service.cache';
import { UrlPathElementSpace } from '@common/enums/url.path.element.space';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { SpaceAbout } from '@domain/space/space.about/space.about.entity';
import { TemplateContentSpace } from '@domain/template/template-content-space/template.content.space.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { TemplatesManager } from '@domain/template/templates-manager/templates.manager.entity';

@Injectable()
export class UrlGeneratorService {
  FIELD_PROFILE_ID = 'profileId';
  FIELD_ID = 'id';

  private endpoint_cluster: string;

  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private urlGeneratorCacheService: UrlGeneratorCacheService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.endpoint_cluster = this.configService.get('hosting.endpoint_cluster', {
      infer: true,
    });
  }

  async generateUrlForProfile(profile: IProfile): Promise<string> {
    const cachedUrl = await this.urlGeneratorCacheService.getUrlFromCache(
      profile.id
    );
    if (cachedUrl) {
      return cachedUrl;
    }
    const url = await this.generateUrlForProfileNotCached(profile);
    if (url && url.length > 0) {
      await this.urlGeneratorCacheService.setUrlCache(profile.id, url);
    }
    return url;
  }

  public generateUrlForVC(nameID: string): string {
    return `${this.endpoint_cluster}/vc/${nameID}`;
  }

  public generateUrlForPlatform(): string {
    return `${this.endpoint_cluster}/home`;
  }

  private async generateUrlForProfileNotCached(
    profile: IProfile
  ): Promise<string> {
    switch (profile.type) {
      case ProfileType.SPACE_ABOUT:
        return await this.getUrlPathByAboutProfileID(profile.id);
      case ProfileType.USER: {
        const userEntityInfo = await this.getNameableEntityInfoForProfileOrFail(
          'user',
          profile.id
        );
        return this.createUrlForUserNameID(userEntityInfo.entityNameID);
      }
      case ProfileType.VIRTUAL_CONTRIBUTOR: {
        const vcEntityInfo = await this.getNameableEntityInfoForProfileOrFail(
          'virtual_contributor',
          profile.id
        );
        return `${this.endpoint_cluster}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/${vcEntityInfo.entityNameID}`;
      }
      case ProfileType.ORGANIZATION: {
        const organizationEntityInfo =
          await this.getNameableEntityInfoForProfileOrFail(
            'organization',
            profile.id
          );
        return this.createUrlForOrganizationNameID(
          organizationEntityInfo.entityNameID
        );
      }
      case ProfileType.CALLOUT_FRAMING:
        return await this.getCalloutFramingUrlPathOrFail(profile.id);
      case ProfileType.COMMUNITY_GUIDELINES: {
        const guidelinesUrl = await this.getCommunityGuidelinesUrlPathOrFail(
          profile.id
        );
        return guidelinesUrl ?? '';
      }
      case ProfileType.POST:
        return await this.getPostUrlPathByField(
          this.FIELD_PROFILE_ID,
          profile.id
        );
      case ProfileType.WHITEBOARD:
        return await this.getWhiteboardUrlPathByProfileID(profile.id);
      case ProfileType.MEMO:
        return await this.getMemoUrlPathByProfileID(profile.id);
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
        return await this.getForumDiscussionUrlPathByProfileID(profile.id);
      case ProfileType.INNOVATION_HUB: {
        const innovationHubEntityInfo =
          await this.getNameableEntityInfoForProfileOrFail(
            'innovation_hub',
            profile.id
          );
        return `${this.endpoint_cluster}/innovation-hubs/${innovationHubEntityInfo.entityNameID}/settings`;
      }
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

  public createUrlForUserNameID(userNameID: string): string {
    return `${this.endpoint_cluster}/${UrlPathBase.USER}/${userNameID}`;
  }

  public async getSpaceUrlPathByID(
    spaceID: string,
    spacePath?: UrlPathElementSpace
  ): Promise<string> {
    let cacheID = `${spaceID}`;
    if (spacePath) {
      cacheID = `${cacheID}-${spacePath}`;
    }
    const cachedUrl =
      await this.urlGeneratorCacheService.getUrlFromCache(cacheID);
    if (cachedUrl) {
      return cachedUrl;
    }
    if (!spaceID || spaceID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find Space with provided ID: ${spaceID}`,
        LogContext.URL_GENERATOR
      );
    }
    const space = await this.entityManager.findOne(Space, {
      where: {
        id: spaceID,
      },
      relations: {
        parentSpace: {
          parentSpace: true,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with provided ID: ${spaceID}`,
        LogContext.URL_GENERATOR
      );
    }
    const url = this.generateUrlForSpaceAllLevels(space, spacePath);
    if (url && url.length > 0) {
      await this.urlGeneratorCacheService.setUrlCache(cacheID, url);
    }
    return url;
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

  public async getNameableEntityInfoForProfileOrFail(
    entityTableName: string,
    profileID: string
  ): Promise<{ entityNameID: string; entityID: string }> {
    const result = await this.getNameableEntityInfo(entityTableName, profileID);

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find nameable parent on entity type '${entityTableName}' for 'profileId': ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return result;
  }

  public async getNameableEntityInfo(
    entityTableName: string,
    profileID: string
  ): Promise<{ entityNameID: string; entityID: string } | null> {
    const [result]: {
      entityID: string;
      entityNameID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityTableName}\`.\`id\` as \`entityID\`, \`${entityTableName}\`.\`nameID\` as entityNameID FROM \`${entityTableName}\`
        WHERE \`${entityTableName}\`.\`profileId\` = '${profileID}'
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
    const templatesManager = await this.entityManager.findOne(
      TemplatesManager,
      {
        where: {
          templatesSet: {
            id: templatesSetID,
          },
        },
      }
    );
    if (!templatesManager) {
      // Must be an InnovationPack
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

    // In a TemplatesManager, on a Space or platform level?
    const space = await this.entityManager.findOne(Space, {
      where: {
        templatesManager: {
          id: templatesManager.id,
        },
      },
    });

    if (space) {
      // TODO: this later should link fully to the actual template by nameID when the client properly picks that up
      return `${this.endpoint_cluster}/${space.nameID}/settings/templates`;
    }
    // Must be a platform level templates manager
    return `${this.endpoint_cluster}/admin/templates`;
  }

  private async getInnovationFlowUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        innovationFlow: {
          profile: {
            id: profileID,
          },
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
      const templateUrl = await this.getSpaceTemplateUrlPathOrFail(
        collaboration.id
      );
      // If no template found, return empty string instead of throwing
      return templateUrl ?? '';
    }

    return this.getSpaceUrlPathByCollaborationID(collaboration.id);
  }

  private async getSpaceTemplateUrlPathOrFail(
    collaborationId: string
  ): Promise<string | null> {
    // Check if this collaboration is part of a TemplateContentSpace
    const contentSpace = await this.entityManager.findOne(
      TemplateContentSpace,
      {
        where: {
          collaboration: {
            id: collaborationId,
          },
        },
        relations: {
          parentSpace: {
            parentSpace: true,
          },
        },
      }
    );
    if (contentSpace) {
      // Get the root TemplateContentSpace
      let rootTemplateContentSpaceId = contentSpace.id;
      if (contentSpace.parentSpace) {
        rootTemplateContentSpaceId = contentSpace.parentSpace.id;
        if (contentSpace.parentSpace.parentSpace) {
          rootTemplateContentSpaceId = contentSpace.parentSpace.parentSpace.id;
        }
      }
      // Find the template for that content space
      const template = await this.entityManager.findOne(Template, {
        where: {
          contentSpace: {
            id: rootTemplateContentSpaceId,
          },
        },
      });
      if (template && template.profile) {
        return this.getTemplateUrlPathOrFail(template.profile.id);
      }
    }

    // No template reference found - return null instead of throwing
    this.logger.warn?.(
      `Unable to find space template for collaboration: ${collaborationId} - returning null`,
      LogContext.URL_GENERATOR
    );
    return null;
  }

  private async getCommunityGuidelinesUrlPathOrFail(
    profileID: string
  ): Promise<string | null> {
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
      this.logger.warn?.(
        `Unable to find community guidelines for profile: ${profileID} - returning null`,
        LogContext.URL_GENERATOR
      );
      return null;
    }

    // Check if it's in a real Space
    const space = await this.entityManager.findOne(Space, {
      where: {
        about: {
          guidelines: {
            id: communityGuidelines.id,
          },
        },
      },
      relations: {
        community: true,
      },
    });

    if (space && space.community) {
      return await this.getSpaceUrlPathByCommunityID(space.community.id);
    }

    // Check if it's directly in a Template
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

    // No parent reference found - return null instead of throwing
    this.logger.warn?.(
      `Unable to find parent for community guidelines: ${communityGuidelines.id} (profile: ${profileID}) - returning null`,
      LogContext.URL_GENERATOR
    );
    return null;
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

    if (!callout.calloutsSet) {
      // Must be a CalloutTemplate
      const template = await this.entityManager.findOne(Template, {
        where: {
          callout: {
            id: callout.id,
          },
        },
        relations: {
          templatesSet: true,
        },
      });
      if (!template || !template.templatesSet) {
        throw new EntityNotFoundException(
          `Unable to find template info for Callout that was not in a Collaboration: ${callout.id}`,
          LogContext.URL_GENERATOR
        );
      }
      const templatesSetUrl = await this.getTemplatesSetUrlPathOrFail(
        template.templatesSet.id
      );
      return `${templatesSetUrl}/${template.nameID}`;
    }

    // Callout is in CalloutsSet, so much be linked to a Space, TemplateContentSpace or KnowledgeBase

    // Next see if have a collaboration parent or not
    const collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          id: callout.calloutsSet.id,
        },
      },
    });
    if (collaboration) {
      // Either Space or TemplateContentSpace
      const space = await this.entityManager.findOne(Space, {
        where: {
          collaboration: {
            id: collaboration.id,
          },
        },
      });
      if (space) {
        const collaborationJourneyUrlPath =
          await this.getSpaceUrlPathByCollaborationID(collaboration.id);
        return `${collaborationJourneyUrlPath}/${UrlPathElement.COLLABORATION}/${callout.nameID}`;
      } else {
        // must be a space template
        const templateUrl = await this.getSpaceTemplateUrlPathOrFail(
          collaboration.id
        );
        // If no template found, return empty string instead of throwing
        return templateUrl ?? '';
      }
    } else {
      // Must be a KnowledgeBase
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
          `Unable to find VirtualContributor for CalloutsSet where id: ${callout.calloutsSet.id}`,
          LogContext.URL_GENERATOR
        );
      }
      const vcUrl = this.generateUrlForVC(virtualContributor.nameID);
      return `${vcUrl}/${UrlPathElement.KNOWLEDGE_BASE}/${callout.nameID}`;
    }
  }

  private async getSpaceUrlPathByCollaborationID(
    collaborationID: string,
    spacePath?: UrlPathElementSpace
  ): Promise<string> {
    if (!collaborationID || collaborationID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find Space with provided collaborationID: ${collaborationID}`,
        LogContext.URL_GENERATOR
      );
    }
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
      relations: {
        parentSpace: {
          parentSpace: true,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with provided collaborationID: ${collaborationID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForSpaceAllLevels(space, spacePath);
  }

  private async getSpaceAboutByProfileID(profileID: string): Promise<string> {
    if (!profileID || profileID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find SpaceAbout with provided profileID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const spaceAbout = await this.entityManager.findOne(SpaceAbout, {
      where: {
        profile: {
          id: profileID,
        },
      },
    });
    if (!spaceAbout) {
      throw new EntityNotFoundException(
        `Unable to find SpaceAbout with provided about profileID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return spaceAbout.id;
  }

  private async getUrlPathByAboutProfileID(
    profileID: string,
    spacePath?: UrlPathElementSpace
  ): Promise<string> {
    const spaceAboutID = await this.getSpaceAboutByProfileID(profileID);
    const space = await this.entityManager.findOne(Space, {
      where: {
        about: {
          id: spaceAboutID,
        },
      },
      relations: {
        parentSpace: {
          parentSpace: true,
        },
      },
    });
    if (space) {
      return this.generateUrlForSpaceAllLevels(space, spacePath);
    }
    // Check if part of a TemplateContentSpace
    const templateContentSpace = await this.entityManager.findOne(
      TemplateContentSpace,
      {
        where: {
          about: {
            id: spaceAboutID,
          },
        },
        relations: {
          parentSpace: {
            parentSpace: true,
          },
        },
      }
    );
    // It's part of a template content space but we need to find the root space of that template:
    const rootTemplateContentSpaceId =
      templateContentSpace?.parentSpace?.parentSpace?.id ??
      templateContentSpace?.parentSpace?.id ??
      templateContentSpace?.id;
    if (!rootTemplateContentSpaceId) {
      throw new EntityNotFoundException(
        'Unable to find url for about',
        LogContext.URL_GENERATOR,
        { spaceAboutID }
      );
    }

    const template = await this.entityManager.findOne(Template, {
      where: {
        contentSpace: {
          id: rootTemplateContentSpaceId,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (template && template.profile) {
      return await this.getTemplateUrlPathOrFail(template.profile.id);
    }
    throw new EntityNotFoundException(
      `Unable to find template url for about with ID: ${spaceAboutID}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getSpaceUrlPathByCommunityID(
    communityID: string,
    spacePath?: UrlPathElementSpace
  ): Promise<string> {
    if (!communityID || communityID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find Space with provided communityID: ${communityID}`,
        LogContext.URL_GENERATOR
      );
    }
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityID,
        },
      },
      relations: {
        parentSpace: {
          parentSpace: true,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with provided about communityID: ${communityID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForSpaceAllLevels(space, spacePath);
  }

  private generateUrlForSpaceAllLevels(
    space: ISpace,
    spacePath?: UrlPathElementSpace
  ): string {
    switch (space.level) {
      case SpaceLevel.L0:
        return this.generateUrlForSpaceL0(space.nameID, spacePath);
      case SpaceLevel.L1:
        if (!space.parentSpace) {
          throw new EntityNotFoundException(
            `Unable to find parent space for space: ${space.id}`,
            LogContext.URL_GENERATOR
          );
        }
        return this.generateUrlForSpaceL1(
          space.parentSpace.nameID,
          space.nameID,
          spacePath
        );

      case SpaceLevel.L2:
        if (!space.parentSpace || !space.parentSpace.parentSpace) {
          throw new EntityNotFoundException(
            `Unable to find parent spaces for subsubspace: ${space.id}`,
            LogContext.URL_GENERATOR
          );
        }
        return this.generateUrlForSpaceL2(
          space.parentSpace.parentSpace.nameID,
          space.parentSpace.nameID,
          space.nameID,
          spacePath
        );
    }
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
        'Unable to find whiteboard where profile',
        LogContext.URL_GENERATOR,
        { whiteboardProfileID }
      );
    }

    return await this.getWhiteboardUrlPath(whiteboard.id, whiteboard.nameID);
  }

  public async getWhiteboardUrlPath(
    whiteboardID: string,
    whiteboardNameID: string
  ): Promise<string> {
    return this.getCalloutElementUrlPath({
      elementId: whiteboardID,
      elementNameId: whiteboardNameID,
      elementType: UrlPathElement.WHITEBOARDS,
      framingWhere: {
        whiteboard: {
          id: whiteboardID,
        },
      },
      contributionWhere: {
        whiteboard: {
          id: whiteboardID,
        },
      },
      templateWhere: {
        whiteboard: {
          id: whiteboardID,
        },
      },
    });
  }

  // TODO: public Not used outside here for now, but notifications use these
  public async getMemoUrlPath(
    memoID: string,
    memoNameID: string
  ): Promise<string> {
    return this.getCalloutElementUrlPath({
      elementId: memoID,
      elementNameId: memoNameID,
      elementType: UrlPathElement.MEMOS,
      framingWhere: {
        memo: {
          id: memoID,
        },
      },
      contributionWhere: {
        memo: {
          id: memoID,
        },
      },
      /* Not yet implemented
      templateWhere: {
        memo: {
          id: memoID,
        },
      },*/
    });
  }

  private async getMemoUrlPathByProfileID(
    memoProfileID: string
  ): Promise<string> {
    const memo = await this.entityManager.findOne(Memo, {
      where: {
        profile: {
          id: memoProfileID,
        },
      },
      select: {
        id: true,
        nameID: true,
      },
    });

    if (!memo) {
      throw new EntityNotFoundException(
        'Unable to find memo where profile',
        LogContext.URL_GENERATOR,
        { memoProfileID }
      );
    }

    return await this.getMemoUrlPath(memo.id, memo.nameID);
  }

  /**
   * Find urls for whiteboards, memos...
   * Either as CalloutFraming, or CalloutContribution, or inside a Callout Template
   */
  public async getCalloutElementUrlPath({
    elementId,
    elementNameId,
    elementType,
    framingWhere,
    contributionWhere,
    templateWhere,
  }: {
    elementId: string;
    elementNameId: string;
    elementType: UrlPathElement;
    framingWhere: FindOptionsWhere<CalloutFraming>;
    contributionWhere: FindOptionsWhere<CalloutContribution>;
    templateWhere?: FindOptionsWhere<Template>;
  }): Promise<string> {
    let callout = await this.entityManager.findOne(Callout, {
      where: {
        framing: {
          ...framingWhere,
        },
      },
    });
    if (callout) {
      const calloutUrlPath = await this.getCalloutUrlPath(callout.id);
      return `${calloutUrlPath}/${elementNameId}`;
    }
    callout = await this.entityManager.findOne(Callout, {
      where: {
        contributions: {
          ...contributionWhere,
        },
      },
    });
    if (callout) {
      const calloutUrlPath = await this.getCalloutUrlPath(callout.id);
      return `${calloutUrlPath}/${elementType}/${elementNameId}`;
    }
    if (!callout && templateWhere) {
      // Whiteboard can be also a direct template
      const template = await this.entityManager.findOne(Template, {
        where: {
          ...templateWhere,
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
      `Unable to find url for ${elementType}`,
      LogContext.URL_GENERATOR,
      { elementId }
    );
  }

  private async getInnovationPackUrlPath(profileID: string): Promise<string> {
    const innovationPackInfo = await this.getNameableEntityInfoForProfileOrFail(
      'innovation_pack',
      profileID
    );
    return `${this.endpoint_cluster}/${UrlPathBase.INNOVATION_PACKS}/${innovationPackInfo.entityNameID}`;
  }

  public async getForumDiscussionUrlPath(
    forumDiscussionID: string
  ): Promise<string> {
    const discussion = await this.entityManager.findOne(Discussion, {
      where: {
        id: forumDiscussionID,
      },
    });
    if (!discussion) {
      throw new EntityNotFoundException(
        `Unable to find discussion with ID: ${forumDiscussionID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForForumDiscussion(discussion);
  }

  private async getForumDiscussionUrlPathByProfileID(
    profileID: string
  ): Promise<string> {
    const discussion = await this.entityManager.findOne(Discussion, {
      where: {
        profile: {
          id: profileID,
        },
      },
    });
    if (!discussion) {
      throw new EntityNotFoundException(
        `Unable to find discussion with profile ID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForForumDiscussion(discussion);
  }

  private generateUrlForForumDiscussion(discussion: IDiscussion): string {
    return `${this.endpoint_cluster}/forum/discussion/${discussion.nameID}`;
  }

  public async getCalendarEventUrlPath(
    calendarEventID: string
  ): Promise<string> {
    return await this.getCalendarEventUrlPathByField(
      this.FIELD_ID,
      calendarEventID
    );
  }

  public async createSpaceAdminCommunityURL(id: string): Promise<string> {
    const spaceAdminUrl = await this.getSpaceUrlPathByID(
      id,
      UrlPathElementSpace.SETTINGS
    );

    return `${spaceAdminUrl}/${UrlPathElementSpace.COMMUNITY}`;
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

    const spaceUrlPath = await this.getSpaceUrlPathByCollaborationID(
      collaboration.id
    );
    return `${spaceUrlPath}/${UrlPathElement.CALENDAR}/${calendarEventInfo.entityNameID}`;
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

  private generateUrlForSpaceL0(
    spaceNameID: string,
    spacePath?: UrlPathElementSpace
  ): string {
    const spaceUrl = `${this.endpoint_cluster}/${spaceNameID}`;
    return this.appendSpacePathToUrl(spaceUrl, spacePath);
  }

  private generateUrlForSpaceL1(
    l0SpaceNameID: string,
    l1SpaceNameID: string,
    spacePath?: UrlPathElementSpace
  ): string {
    const spaceUrl = `${this.endpoint_cluster}/${l0SpaceNameID}/${UrlPathElement.CHALLENGES}/${l1SpaceNameID}`;
    return this.appendSpacePathToUrl(spaceUrl, spacePath);
  }

  private generateUrlForSpaceL2(
    l0SpaceNameID: string,
    l1SpaceNameID: string,
    l2SpaceNameID: string,
    spacePath?: UrlPathElementSpace
  ): string {
    const l1SpaceUrlPath = this.generateUrlForSpaceL1(
      l0SpaceNameID,
      l1SpaceNameID
    );
    const spaceUrl = `${l1SpaceUrlPath}/${UrlPathElement.OPPORTUNITIES}/${l2SpaceNameID}`;
    return this.appendSpacePathToUrl(spaceUrl, spacePath);
  }

  private appendSpacePathToUrl(
    url: string,
    spacePath?: UrlPathElementSpace
  ): string {
    if (spacePath) {
      return `${url}/${spacePath}`;
    }
    return url;
  }
}
