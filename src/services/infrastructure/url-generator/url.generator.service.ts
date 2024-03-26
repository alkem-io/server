import { LogContext, ProfileType } from '@common/enums';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { EntityNotFoundException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { Cache, CachingConfig } from 'cache-manager';
import { Space } from '@domain/challenge/space/space.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';

@Injectable()
export class UrlGeneratorService {
  cacheOptions: CachingConfig = {
    ttl: 1, // milliseconds
  };

  PATH_USER = 'user';
  PATH_ORGANIZATION = 'organization';
  PATH_INNOVATION_LIBRARY = 'innovation-library';
  PATH_INNOVATION_PACKS = 'innovation-packs';
  PATH_CHALLENGES = 'challenges';
  PATH_OPPORTUNITIES = 'opportunities';
  PATH_COLLABORATION = 'collaboration';
  PATH_CONTRIBUTE = 'contribute';
  PATH_POSTS = 'posts';
  PATH_WHITEBOARDS = 'whiteboards';
  PATH_FORUM = 'forum';
  PATH_DISCUSSION = 'discussion';
  PATH_CALENDAR = 'calendar';

  FIELD_PROFILE_ID = 'profileId';
  FIELD_ID = 'id';

  private endpoint_cluster: string;

  constructor(
    private configService: ConfigService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    this.endpoint_cluster = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;
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

  async generateUrlForOpportunity(opportunityID: string): Promise<string> {
    const cachedUrl = await this.getUrlFromCache(opportunityID);
    if (cachedUrl) {
      return cachedUrl;
    }
    const opportunityUrlPath = await this.getOpportunityUrlPath(
      this.FIELD_ID,
      opportunityID
    );
    if (!opportunityUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find opportunity for ID: ${opportunityID}`,
        LogContext.URL_GENERATOR
      );
    }
    await this.setUrlCache(opportunityID, opportunityUrlPath);
    return opportunityUrlPath;
  }

  async generateUrlForChallenge(challengeID: string): Promise<string> {
    const cachedUrl = await this.getUrlFromCache(challengeID);
    if (cachedUrl) {
      return cachedUrl;
    }
    const challengeUrlPath = await this.getChallengeUrlPath(
      this.FIELD_ID,
      challengeID
    );
    if (!challengeUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find challenge for ID: ${challengeID}`,
        LogContext.URL_GENERATOR
      );
    }
    await this.setUrlCache(challengeID, challengeUrlPath);
    return challengeUrlPath;
  }

  public generateUrlForSpace(spaceNameID: string): string {
    return `${this.endpoint_cluster}/${spaceNameID}`;
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
        const challengeUrlPath = await this.getChallengeUrlPath(
          this.FIELD_PROFILE_ID,
          profile.id
        );
        if (!challengeUrlPath) {
          throw new EntityNotFoundException(
            `Unable to find challenge for profileId: ${profile.id}`,
            LogContext.URL_GENERATOR
          );
        }
        return challengeUrlPath;
      case ProfileType.OPPORTUNITY:
        const opportunityUrlPath = await this.getOpportunityUrlPath(
          this.FIELD_PROFILE_ID,
          profile.id
        );
        if (!opportunityUrlPath) {
          throw new EntityNotFoundException(
            `Unable to find opportunity for profileId: ${profile.id}`,
            LogContext.URL_GENERATOR
          );
        }
        return opportunityUrlPath;
      case ProfileType.USER:
        const userEntityInfo = await this.getNameableEntityInfoOrFail(
          'user',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return `${this.endpoint_cluster}/${this.PATH_USER}/${userEntityInfo.entityNameID}`;
      case ProfileType.ORGANIZATION:
        const organizationEntityInfo = await this.getNameableEntityInfoOrFail(
          'organization',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return `${this.endpoint_cluster}/${this.PATH_ORGANIZATION}/${organizationEntityInfo.entityNameID}`;
      case ProfileType.CALLOUT_FRAMING:
        return await this.getCalloutFramingUrlPathOrFail(profile.id);
      case ProfileType.POST:
        return await this.getPostUrlPath(profile.id);
      case ProfileType.WHITEBOARD:
        return await this.getWhiteboardUrlPath(profile.id);
      case ProfileType.INNOVATION_FLOW:
        return await this.getInnovationFlowUrlPathOrFail(profile.id);
      case ProfileType.WHITEBOARD_TEMPLATE:
        return await this.getTemplateUrlPathOrFail(
          'whiteboard_template',
          profile.id
        );
      case ProfileType.POST_TEMPLATE:
        return await this.getTemplateUrlPathOrFail('post_template', profile.id);
      case ProfileType.CALLOUT_TEMPLATE:
        return await this.getTemplateUrlPathOrFail(
          'callout_template',
          profile.id
        );
      case ProfileType.INNOVATION_FLOW_TEMPLATE:
        return await this.getTemplateUrlPathOrFail(
          'innovation_flow_template',
          profile.id
        );
      case ProfileType.INNOVATION_PACK:
        return await this.getInnovationPackUrlPath(profile.id);
      case ProfileType.CALENDAR_EVENT:
        return await this.getCalendarEventUrlPath(profile.id);

      case ProfileType.DISCUSSION:
        const discussionEntityInfo = await this.getNameableEntityInfoOrFail(
          'discussion',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return `${this.endpoint_cluster}/forum/discussion/${discussionEntityInfo.entityNameID}`;
      case ProfileType.INNOVATION_HUB:
        const innovationHubEntityInfo = await this.getNameableEntityInfoOrFail(
          'innovation_hub',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        //I am not sure whether actually we shouldn't return the subdomain of the innovation hub here? It's either that or the admin
        return `${this.endpoint_cluster}/admin/innovation-hubs/${innovationHubEntityInfo.entityNameID}`;
      case ProfileType.USER_GROUP:
        // to do: implement and decide what to do with user groups
        return '';
    }
    return '';
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

  public async getTemplateInfo(
    entityTableName: string,
    profileID: string
  ): Promise<{ entityID: string; templatesSetID: string } | null> {
    const [result]: {
      entityID: string;
      templatesSetID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityTableName}\`.\`id\` as \`entityID\`, \`${entityTableName}\`.\`templatesSetId\` as templatesSetID FROM \`${entityTableName}\`
        WHERE \`${entityTableName}\`.\`${this.FIELD_PROFILE_ID}\` = '${profileID}'
      `
    );
    if (!result) return null;
    return result;
  }

  private async getTemplateUrlPathOrFail(
    entityTableName: string,
    profileID: string
  ): Promise<string> {
    const templateInfo = await this.getTemplateInfo(entityTableName, profileID);
    if (!templateInfo || !templateInfo.templatesSetID) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for ${entityTableName} using profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const templatesSetID = templateInfo.templatesSetID;

    const space = await this.entityManager.findOne(Space, {
      where: {
        account: {
          library: {
            id: templatesSetID,
          },
        },
      },
    });

    if (space) {
      // TODO: this later should link fully to the actual template by nameID when the client properly picks that up
      return `${this.endpoint_cluster}/admin/spaces/${space.nameID}/templates`;
    }
    const innovationPackInfo = await this.getNameableEntityInfoOrFail(
      'innovation_pack',
      'templatesSetId',
      templatesSetID
    );
    return `${this.endpoint_cluster}/${this.PATH_INNOVATION_PACKS}/${innovationPackInfo.entityNameID}`;
  }

  private async getSpaceUrlPath(
    fieldName: string,
    fieldID: string
  ): Promise<string | undefined> {
    const spaceInfo = await this.getNameableEntityInfo(
      'space',
      fieldName,
      fieldID
    );

    if (!spaceInfo) {
      return undefined;
    }

    return this.generateUrlForSpace(spaceInfo.entityNameID);
  }

  private async getChallengeUrlPath(
    fieldName: string,
    fieldID: string
  ): Promise<string | undefined> {
    const [result]: {
      challengeId: string;
      challengeNameId: string;
      spaceId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT challenge.id as challengeId, challenge.nameID as challengeNameId, challenge.spaceID as spaceId FROM challenge
        WHERE challenge.${fieldName} = '${fieldID}'
      `
    );

    if (!result) {
      return undefined;
    }

    const spaceUrlPath = await this.getSpaceUrlPath(
      this.FIELD_ID,
      result.spaceId
    );
    if (!spaceUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find space for ${fieldName}: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }
    return `${spaceUrlPath}/challenges/${result.challengeNameId}`;
  }

  private async getOpportunityUrlPath(
    fieldName: string,
    fieldID: string
  ): Promise<string | undefined> {
    const [result]: {
      opportunityId: string;
      opportunityNameId: string;
      challengeId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT opportunity.id as opportunityId, opportunity.nameID as opportunityNameId, opportunity.challengeId as challengeId FROM opportunity
        WHERE opportunity.${fieldName} = '${fieldID}'
      `
    );

    if (!result) {
      return undefined;
    }

    const challengeUrlPath = await this.getChallengeUrlPath(
      this.FIELD_ID,
      result.challengeId
    );
    return `${challengeUrlPath}/opportunities/${result.opportunityNameId}`;
  }

  private async getInnovationFlowUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    const [innovationFlowInfo]: {
      entityID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT innovation_flow.id as entityID FROM innovation_flow
        WHERE innovation_flow.profileId = '${profileID}'
      `
    );

    if (!innovationFlowInfo) {
      throw new EntityNotFoundException(
        `Unable to find innovationFlow for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    const [collaborationInfo]: {
      entityID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT collaboration.id as entityID FROM collaboration
        WHERE collaboration.innovationFlowId = '${innovationFlowInfo.entityID}'
      `
    );

    if (collaborationInfo) {
      const collaborationJourneyUrlPath = await this.getJourneyUrlPath(
        'collaborationId',
        collaborationInfo.entityID
      );
      return `${collaborationJourneyUrlPath}/innovation-flow`;
    }

    throw new EntityNotFoundException(
      `Unable to find collaboration for journey with innovationFlow with ID: ${innovationFlowInfo.entityID}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getCalloutFramingUrlPathOrFail(
    profileID: string
  ): Promise<string> {
    // Framing is used in both Callout and CalloutTemplate entities
    const [calloutFraming]: {
      id: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT callout_framing.id FROM callout_framing
        WHERE callout_framing.profileId = '${profileID}'
      `
    );
    if (!calloutFraming) {
      throw new EntityNotFoundException(
        `Unable to find CalloutFraming with profile ID: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    const [callout]: {
      id: string;
      nameID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT callout.id, callout.nameID FROM callout
        WHERE callout.framingId = '${calloutFraming.id}'
      `
    );
    if (callout) {
      return await this.getCalloutUrlPath(callout.id);
    }

    const [calloutTemplate]: {
      id: string;
      profileId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT callout_template.id, callout_template.profileId FROM callout_template
        WHERE callout_template.framingId = '${calloutFraming.id}'
      `
    );
    if (calloutTemplate) {
      return await this.getTemplateUrlPathOrFail(
        'callout_template',
        calloutTemplate.profileId
      );
    }

    throw new EntityNotFoundException(
      `Unable to find path for CalloutFraming with ID: ${calloutFraming.id}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getCalloutUrlPath(calloutID: string): Promise<string> {
    const [result]: {
      calloutId: string;
      calloutNameId: string;
      collaborationId: string;
    }[] = await this.entityManager.connection
      .query(`SELECT callout.id AS calloutId, callout.nameID AS calloutNameId, callout.collaborationId AS collaborationId
      FROM callout WHERE callout.id = '${calloutID}'`);

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find callout where id: ${calloutID}`,
        LogContext.URL_GENERATOR
      );
    }
    const collaborationJourneyUrlPath = await this.getJourneyUrlPath(
      'collaborationId',
      result.collaborationId
    );
    return `${collaborationJourneyUrlPath}/${this.PATH_COLLABORATION}/${result.calloutNameId}`;
  }

  private async getJourneyUrlPath(
    fieldName: string,
    fieldID: string
  ): Promise<string> {
    let collaborationJourneyUrlPath = await this.getSpaceUrlPath(
      fieldName,
      fieldID
    );
    if (!collaborationJourneyUrlPath) {
      collaborationJourneyUrlPath = await this.getChallengeUrlPath(
        fieldName,
        fieldID
      );
    }
    if (!collaborationJourneyUrlPath) {
      collaborationJourneyUrlPath = await this.getOpportunityUrlPath(
        fieldName,
        fieldID
      );
    }
    if (!collaborationJourneyUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find url path for collaboration: ${fieldID}`,
        LogContext.URL_GENERATOR
      );
    }
    return collaborationJourneyUrlPath;
  }

  private async getPostUrlPath(profileID: string): Promise<string> {
    const [result]: {
      postId: string;
      postNameId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT post.id as postId, post.nameID as postNameId FROM post
        WHERE post.profileId = '${profileID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find post where profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    const [contributionResult]: {
      calloutId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT callout_contribution.id, callout_contribution.calloutId as calloutId FROM callout_contribution
        WHERE callout_contribution.postId = '${result.postId}'
      `
    );
    if (!contributionResult) {
      throw new EntityNotFoundException(
        `Unable to contribution for post where postID: ${result.postId}`,
        LogContext.URL_GENERATOR
      );
    }

    const calloutUrlPath = await this.getCalloutUrlPath(
      contributionResult.calloutId
    );
    return `${calloutUrlPath}/${this.PATH_POSTS}/${result.postNameId}`;
  }

  private async getWhiteboardUrlPath(profileID: string): Promise<string> {
    const [whiteboard]: {
      id: string;
      nameID: string;
    }[] = await this.entityManager.connection.query(
      `
          SELECT whiteboard.id, whiteboard.nameID FROM whiteboard
          WHERE whiteboard.profileId = '${profileID}'
        `
    );

    if (!whiteboard) {
      throw new EntityNotFoundException(
        `Unable to find whiteboard where profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    let callout = await this.entityManager.findOne(Callout, {
      where: {
        framing: {
          whiteboard: {
            id: whiteboard.id,
          },
        },
      },
    });
    if (!callout) {
      callout = await this.entityManager.findOne(Callout, {
        where: {
          contributions: {
            whiteboard: {
              id: whiteboard.id,
            },
          },
        },
      });
    }
    if (callout) {
      const calloutUrlPath = await this.getCalloutUrlPath(callout.id);
      return `${calloutUrlPath}/${this.PATH_WHITEBOARDS}/${whiteboard.nameID}`;
    }

    throw new EntityNotFoundException(
      `Unable to find callout where whiteboardId: ${whiteboard.id}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getInnovationPackUrlPath(profileID: string): Promise<string> {
    const innovationPackInfo = await this.getNameableEntityInfoOrFail(
      'innovation_pack',
      this.FIELD_PROFILE_ID,
      profileID
    );

    return `${this.endpoint_cluster}/${this.PATH_INNOVATION_PACKS}/${innovationPackInfo.entityNameID}`;
  }

  private async getCalendarEventUrlPath(profileID: string): Promise<string> {
    const [calendarEventInfo]: {
      entityID: string;
      entityNameID: string;
      calendarID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT calendar_event.id as entityID, calendar_event.nameID as entityNameID, calendar_event.calendarId as calendarID FROM calendar_event
        WHERE calendar_event.profileId = '${profileID}'
      `
    );

    if (!calendarEventInfo) {
      throw new EntityNotFoundException(
        `Unable to find calendar event where profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }

    const [timelineInfo]: {
      entityID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT timeline.id as entityID FROM timeline
        WHERE timeline.calendarId = '${calendarEventInfo.calendarID}'
      `
    );
    if (!timelineInfo) {
      throw new EntityNotFoundException(
        `Unable to find timeline with calendar: ${calendarEventInfo.calendarID}`,
        LogContext.URL_GENERATOR
      );
    }

    const [collaborationInfo]: {
      entityID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT collaboration.id as entityID FROM collaboration
        WHERE collaboration.timelineId = '${timelineInfo.entityID}'
      `
    );
    if (!collaborationInfo) {
      throw new EntityNotFoundException(
        `Unable to find collaboration with timeline: ${timelineInfo.entityID}`,
        LogContext.URL_GENERATOR
      );
    }

    const journeyUrlPath = await this.getJourneyUrlPath(
      'collaborationId',
      collaborationInfo.entityID
    );
    return `${journeyUrlPath}/dashboard/${this.PATH_CALENDAR}/${calendarEventInfo.entityNameID}`;
  }
}
