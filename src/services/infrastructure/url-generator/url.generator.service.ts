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
import { EntityManager } from 'typeorm';
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
import { UrlGeneratorCacheService } from './url.generator.service.cache';
import { UrlPathElementSpace } from '@common/enums/url.path.element.space';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';

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
      case ProfileType.SPACE:
      case ProfileType.CHALLENGE:
      case ProfileType.OPPORTUNITY:
        return await this.getSpaceUrlPathByAboutProfileID(profile.id);
      case ProfileType.USER:
        const userEntityInfo = await this.getNameableEntityInfoForProfileOrFail(
          'user',
          profile.id
        );
        return this.createUrlForUserNameID(userEntityInfo.entityNameID);
      case ProfileType.VIRTUAL_CONTRIBUTOR:
        const vcEntityInfo = await this.getNameableEntityInfoForProfileOrFail(
          'virtual_contributor',
          profile.id
        );
        return `${this.endpoint_cluster}/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/${vcEntityInfo.entityNameID}`;
      case ProfileType.ORGANIZATION:
        const organizationEntityInfo =
          await this.getNameableEntityInfoForProfileOrFail(
            'organization',
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
        return await this.getForumDiscussionUrlPathByProfileID(profile.id);
      case ProfileType.INNOVATION_HUB:
        const innovationHubEntityInfo =
          await this.getNameableEntityInfoForProfileOrFail(
            'innovation_hub',
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

    return this.getSpaceUrlPathByCollaborationID(collaboration.id);
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
      return await this.getSpaceUrlPathByCommunityID(community.id);
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
      `Unable to find community guidelines for profile: ${profileID}, community guidelines: ${communityGuidelines.id}`,
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

        const collaborationJourneyUrlPath =
          await this.getSpaceUrlPathByCollaborationID(collaboration.id);
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

  private async getSpaceUrlPathByAboutProfileID(
    profileID: string,
    spacePath?: UrlPathElementSpace
  ): Promise<string> {
    if (!profileID || profileID === 'null') {
      throw new EntityNotFoundException(
        `Unable to find Space with provided collaborationID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const space = await this.entityManager.findOne(Space, {
      where: {
        about: {
          profile: {
            id: profileID,
          },
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
        `Unable to find Space with provided about profileID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return this.generateUrlForSpaceAllLevels(space, spacePath);
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
