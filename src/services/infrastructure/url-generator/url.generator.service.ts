import { LogContext, ProfileType } from '@common/enums';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { SpaceLevel } from '@common/enums/space.level';
import { UrlPathBase } from '@common/enums/url.path.base';
import { UrlPathElement } from '@common/enums/url.path.element';
import { UrlPathElementSpace } from '@common/enums/url.path.element.space';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { calloutFramings } from '@domain/collaboration/callout-framing/callout.framing.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { knowledgeBases } from '@domain/common/knowledge-base/knowledge.base.schema';
import { memos } from '@domain/common/memo/memo.schema';
import { IProfile } from '@domain/common/profile/profile.interface';
import { whiteboards } from '@domain/common/whiteboard/whiteboard.schema';
import { communityGuidelines } from '@domain/community/community-guidelines/community.guidelines.schema';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Organization } from '@domain/community/organization/organization.entity';
import { organizations } from '@domain/community/organization/organization.schema';
import { User } from '@domain/community/user/user.entity';
import { users } from '@domain/community/user/user.schema';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { spaces } from '@domain/space/space/space.schema';
import { ISpace } from '@domain/space/space/space.interface';
import { spaceAbouts } from '@domain/space/space.about/space.about.schema';
import { templates } from '@domain/template/template/template.schema';
import { templateContentSpaces } from '@domain/template/template-content-space/template.content.space.schema';
import { templatesManagers } from '@domain/template/templates-manager/templates.manager.schema';
import { innovationPacks } from '@library/innovation-pack/innovation.pack.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { discussions } from '@platform/forum-discussion/discussion.schema';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, sql } from 'drizzle-orm';
import { UrlGeneratorCacheService } from './url.generator.service.cache';

@Injectable()
export class UrlGeneratorService {
  FIELD_PROFILE_ID = 'profileId';
  FIELD_ID = 'id';

  private endpoint_cluster: string;

  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private urlGeneratorCacheService: UrlGeneratorCacheService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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

  public async generateUrlForVCById(id: string): Promise<string> {
    const vc = await this.db.query.virtualContributors.findFirst({
      where: eq(virtualContributors.id, id),
      columns: {
        id: true,
        nameID: true,
      },
    });
    if (!vc) {
      throw new EntityNotFoundException(
        'Unable to find VirtualContributor',
        LogContext.URL_GENERATOR,
        { vcId: id }
      );
    }
    return this.generateUrlForVC(vc.nameID);
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
      case ProfileType.KNOWLEDGE_BASE: {
        const vc =
          await this.getVirtualContributorFromKnowledgeBaseProfileOrFail(
            profile.id
          );
        return `${this.endpoint_cluster}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/${vc.nameID}/${UrlPathElement.KNOWLEDGE_BASE}`;
      }
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
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.id, spaceID),
      with: {
        parentSpace: {
          with: {
            parentSpace: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with provided ID: ${spaceID}`,
        LogContext.URL_GENERATOR
      );
    }
    const url = this.generateUrlForSpaceAllLevels(space as unknown as ISpace, spacePath);
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
    // Table name is dynamic so we use sql.raw for the identifier, but parameterize the value
    const result = await this.db.execute<{
      entityID: string;
      entityNameID: string;
    }>(sql`
      SELECT ${sql.identifier(entityTableName)}."id" as "entityID", ${sql.identifier(entityTableName)}."nameID" as "entityNameID"
      FROM ${sql.identifier(entityTableName)}
      WHERE ${sql.identifier(entityTableName)}."profileId" = ${profileID}
    `);

    if (!result || result.length === 0) {
      return null;
    }
    return result[0];
  }

  private async getTemplateUrlPathOrFail(profileID: string): Promise<string> {
    const template = await this.db.query.templates.findFirst({
      where: eq(templates.profileId, profileID),
      with: {
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
    const templatesManager = await this.db.query.templatesManagers.findFirst({
      where: eq(templatesManagers.templatesSetId, templatesSetID),
    });
    if (!templatesManager) {
      // Must be an InnovationPack
      const innovationPack = await this.db.query.innovationPacks.findFirst({
        where: eq(innovationPacks.templatesSetId, templatesSetID),
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
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.templatesManagerId, templatesManager.id),
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
    // Find the innovation flow by profileId, then find its collaboration
    const [result] = await this.db.execute<{
      collaborationId: string;
      isTemplate: boolean;
    }>(sql`
      SELECT c."id" as "collaborationId", c."isTemplate"
      FROM "collaboration" c
      JOIN "innovation_flow" f ON c."innovationFlowId" = f."id"
      WHERE f."profileId" = ${profileID}
    `);
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find innovationFlow for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    if (result.isTemplate) {
      const templateUrl = await this.getSpaceTemplateUrlPathOrFail(
        result.collaborationId
      );
      // If no template found, return empty string instead of throwing
      return templateUrl ?? '';
    }

    return this.getSpaceUrlPathByCollaborationID(result.collaborationId);
  }

  private async getSpaceTemplateUrlPathOrFail(
    collaborationId: string
  ): Promise<string | null> {
    // Check if this collaboration is part of a TemplateContentSpace
    const contentSpace = await this.db.query.templateContentSpaces.findFirst({
      where: eq(templateContentSpaces.collaborationId, collaborationId),
      with: {
        parentSpace: {
          with: {
            parentSpace: true,
          },
        },
      },
    });
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
      const template = await this.db.query.templates.findFirst({
        where: eq(templates.contentSpaceId, rootTemplateContentSpaceId),
        with: {
          profile: true,
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
    const cg = await this.db.query.communityGuidelines.findFirst({
      where: eq(communityGuidelines.profileId, profileID),
    });

    if (!cg) {
      this.logger.warn?.(
        `Unable to find community guidelines for profile: ${profileID} - returning null`,
        LogContext.URL_GENERATOR
      );
      return null;
    }

    // Check if it's in a real Space via spaceAbout.guidelinesId
    const spaceAbout = await this.db.query.spaceAbouts.findFirst({
      where: eq(spaceAbouts.guidelinesId, cg.id),
    });
    if (spaceAbout) {
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.aboutId, spaceAbout.id),
        with: {
          community: true,
        },
      });
      if (space && space.community) {
        return await this.getSpaceUrlPathByCommunityID(space.community.id);
      }
    }

    // Check if it's directly in a Template
    const template = await this.db.query.templates.findFirst({
      where: eq(templates.communityGuidelinesId, cg.id),
      with: {
        profile: true,
      },
    });

    if (template && template.profile) {
      return await this.getTemplateUrlPathOrFail(template.profile.id);
    }

    // No parent reference found - return null instead of throwing
    this.logger.warn?.(
      `Unable to find parent for community guidelines: ${cg.id} (profile: ${profileID}) - returning null`,
      LogContext.URL_GENERATOR
    );
    return null;
  }

  private async getCalloutFramingUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    // Find the framing by profileId, then find its callout
    const framing = await this.db.query.calloutFramings.findFirst({
      where: eq(calloutFramings.profileId, profileID),
    });
    if (!framing) {
      throw new EntityNotFoundException(
        `Unable to find Callout with Framing with profile ID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.framingId, framing.id),
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
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutID),
      with: {
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
      const template = await this.db.query.templates.findFirst({
        where: eq(templates.calloutId, callout.id),
        with: {
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

    // Callout is in CalloutsSet, so must be linked to a Space, TemplateContentSpace or KnowledgeBase

    // Next see if have a collaboration parent or not
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, callout.calloutsSet.id),
    });
    if (collaboration) {
      // Either Space or TemplateContentSpace
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.collaborationId, collaboration.id),
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
      const knowledgeBase = await this.db.query.knowledgeBases.findFirst({
        where: eq(knowledgeBases.calloutsSetId, callout.calloutsSet.id),
      });
      let vc: any = undefined;
      if (knowledgeBase) {
        vc = await this.db.query.virtualContributors.findFirst({
          where: eq(virtualContributors.knowledgeBaseId, knowledgeBase.id),
        });
      }
      if (!vc) {
        throw new EntityNotFoundException(
          'Unable to find VirtualContributor for CalloutsSet',
          LogContext.URL_GENERATOR,
          { calloutsSetId: callout.calloutsSet.id }
        );
      }
      const vcUrl = this.generateUrlForVC(vc.nameID);
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
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaborationID),
      with: {
        parentSpace: {
          with: {
            parentSpace: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with provided collaborationID: ${collaborationID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForSpaceAllLevels(space as unknown as ISpace, spacePath);
  }

  private async getSpaceAboutByProfileID(profileID: string): Promise<string> {
    if (!profileID || profileID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find SpaceAbout with provided profileID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const spaceAbout = await this.db.query.spaceAbouts.findFirst({
      where: eq(spaceAbouts.profileId, profileID),
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
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.aboutId, spaceAboutID),
      with: {
        parentSpace: {
          with: {
            parentSpace: true,
          },
        },
      },
    });
    if (space) {
      return this.generateUrlForSpaceAllLevels(space as unknown as ISpace, spacePath);
    }
    // Check if part of a TemplateContentSpace
    const tcs = await this.db.query.templateContentSpaces.findFirst({
      where: eq(templateContentSpaces.aboutId, spaceAboutID),
      with: {
        parentSpace: {
          with: {
            parentSpace: true,
          },
        },
      },
    });
    // It's part of a template content space but we need to find the root space of that template:
    const rootTemplateContentSpaceId =
      tcs?.parentSpace?.parentSpace?.id ??
      tcs?.parentSpace?.id ??
      tcs?.id;
    if (!rootTemplateContentSpaceId) {
      throw new EntityNotFoundException(
        'Unable to find url for about',
        LogContext.URL_GENERATOR,
        { spaceAboutID }
      );
    }

    const template = await this.db.query.templates.findFirst({
      where: eq(templates.contentSpaceId, rootTemplateContentSpaceId),
      with: {
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
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.communityId, communityID),
      with: {
        parentSpace: {
          with: {
            parentSpace: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with provided about communityID: ${communityID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForSpaceAllLevels(space as unknown as ISpace, spacePath);
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
    const [result] = await this.db.execute<{
      postId: string;
      postNameId: string;
    }>(sql`
      SELECT post.id as "postId", post."nameID" as "postNameId" FROM post
      WHERE post.${sql.identifier(fieldName)} = ${fieldID}
    `);

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find post where profile: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }

    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.postId, result.postId),
      with: {
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
    const whiteboard = await this.db.query.whiteboards.findFirst({
      where: eq(whiteboards.profileId, whiteboardProfileID),
      columns: {
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
      framingColumn: 'whiteboardId',
      contributionColumn: 'whiteboardId',
      templateColumn: 'whiteboardId',
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
      framingColumn: 'memoId',
      contributionColumn: 'memoId',
    });
  }

  private async getMemoUrlPathByProfileID(
    memoProfileID: string
  ): Promise<string> {
    const memo = await this.db.query.memos.findFirst({
      where: eq(memos.profileId, memoProfileID),
      columns: {
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
    framingColumn,
    contributionColumn,
    templateColumn,
  }: {
    elementId: string;
    elementNameId: string;
    elementType: UrlPathElement;
    framingColumn: 'whiteboardId' | 'memoId';
    contributionColumn: 'whiteboardId' | 'memoId';
    templateColumn?: 'whiteboardId';
  }): Promise<string> {
    // Check framing
    const framing = await this.db.query.calloutFramings.findFirst({
      where: eq(calloutFramings[framingColumn], elementId),
    });
    if (framing) {
      const callout = await this.db.query.callouts.findFirst({
        where: eq(callouts.framingId, framing.id),
      });
      if (callout) {
        const calloutUrlPath = await this.getCalloutUrlPath(callout.id);
        return `${calloutUrlPath}/${elementNameId}`;
      }
    }

    // Check contributions
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions[contributionColumn], elementId),
      with: {
        callout: true,
      },
    });
    if (contribution?.callout) {
      const calloutUrlPath = await this.getCalloutUrlPath(contribution.callout.id);
      return `${calloutUrlPath}/${elementType}/${elementNameId}`;
    }

    // Check templates (for whiteboards)
    if (templateColumn) {
      const template = await this.db.query.templates.findFirst({
        where: eq(templates[templateColumn], elementId),
        with: {
          profile: true,
        },
      });
      if (template && template.profile) {
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
    const discussion = await this.db.query.discussions.findFirst({
      where: eq(discussions.id, forumDiscussionID),
    });
    if (!discussion) {
      throw new EntityNotFoundException(
        `Unable to find discussion with ID: ${forumDiscussionID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForForumDiscussion(discussion as unknown as IDiscussion);
  }

  private async getForumDiscussionUrlPathByProfileID(
    profileID: string
  ): Promise<string> {
    const discussion = await this.db.query.discussions.findFirst({
      where: eq(discussions.profileId, profileID),
    });
    if (!discussion) {
      throw new EntityNotFoundException(
        `Unable to find discussion with profile ID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForForumDiscussion(discussion as unknown as IDiscussion);
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
    const [calendarEventInfo] = await this.db.execute<{
      entityID: string;
      entityNameID: string;
      calendarID: string;
    }>(sql`
      SELECT calendar_event.id as "entityID", calendar_event."nameID" as "entityNameID", calendar_event."calendarId" as "calendarID" FROM calendar_event
      WHERE calendar_event.${sql.identifier(fieldName)} = ${fieldID}
    `);

    if (!calendarEventInfo) {
      throw new EntityNotFoundException(
        `Unable to find calendar event where profile: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }

    // Find timeline by calendarId, then collaboration by timelineId
    const [collaborationResult] = await this.db.execute<{
      collaborationId: string;
    }>(sql`
      SELECT c."id" as "collaborationId"
      FROM "collaboration" c
      JOIN "timeline" t ON c."timelineId" = t."id"
      WHERE t."calendarId" = ${calendarEventInfo.calendarID}
    `);

    if (!collaborationResult) {
      throw new EntityNotFoundException(
        `Unable to find collaboration timeline with calendar: ${calendarEventInfo.calendarID}`,
        LogContext.URL_GENERATOR
      );
    }

    const spaceUrlPath = await this.getSpaceUrlPathByCollaborationID(
      collaborationResult.collaborationId
    );
    return `${spaceUrlPath}/${UrlPathElement.CALENDAR}/${calendarEventInfo.entityNameID}`;
  }

  private async getVirtualContributorFromKnowledgeBaseProfileOrFail(
    kbProfileId: string
  ) {
    // Find knowledge base by profileId, then find VC by knowledgeBaseId
    const kb = await this.db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.profileId, kbProfileId),
    });
    if (!kb) {
      throw new EntityNotFoundException(
        'Unable to find VirtualContributor for KnowledgeBase with profile',
        LogContext.URL_GENERATOR,
        { kbProfileId }
      );
    }
    const vc = await this.db.query.virtualContributors.findFirst({
      where: eq(virtualContributors.knowledgeBaseId, kb.id),
    });

    if (!vc) {
      throw new EntityNotFoundException(
        'Unable to find VirtualContributor for KnowledgeBase with profile',
        LogContext.URL_GENERATOR,
        { kbProfileId }
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
