import { LogContext, ProfileType } from '@common/enums';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';

@Injectable()
export class UrlGeneratorService {
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

  FIELD_PROFILE_ID = 'profileId';
  FIELD_ID = 'id';

  private endpoint_cluster: string;

  constructor(
    private configService: ConfigService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.endpoint_cluster = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;
  }

  async generateUrlForProfile(profile: IProfile): Promise<string> {
    switch (profile.type) {
      case ProfileType.SPACE:
        const spaceEntityInfo = await this.getNameableEntityInfoOrFail(
          'space',
          this.FIELD_PROFILE_ID,
          profile.id
        );
        return `${this.endpoint_cluster}/${spaceEntityInfo.entityNameID}`;
      case ProfileType.CHALLENGE:
        const challengeUrlPath = await this.getChallengeUrlPath(
          'profileId',
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
          'profileId',
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
      case ProfileType.CALLOUT:
        return await this.getCalloutUrlPath('profileId', profile.id);
      case ProfileType.POST:
        return await this.getPostUrlPath(profile.id);
      case ProfileType.WHITEBOARD:
        return await this.getWhiteboardUrlPath(profile.id);
      case ProfileType.INNOVATION_FLOW:
        return await this.getInnovationFlowUrlPath(profile.id);
      case ProfileType.WHITEBOARD_TEMPLATE:
        // Todo: fix
        return '';
      case ProfileType.POST_TEMPLATE:
        // Todo: fix
        return '';
    }

    throw new NotSupportedException(
      `Unable to generate URL for profile (${profile.id}) of type: ${profile.type}`,
      LogContext.URL_GENERATOR
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

    return `${this.endpoint_cluster}/${spaceInfo.entityNameID}`;
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

    const spaceUrlPath = await this.getSpaceUrlPath('id', result.spaceId);
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
      'id',
      result.challengeId
    );
    return `${challengeUrlPath}/opportunities/${result.opportunityNameId}`;
  }

  private async getInnovationFlowUrlPath(profileID: string): Promise<string> {
    const [innovationFlowInfo]: {
      entityID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT innovation_flow.id as entityID FROM innovation_flow
        WHERE innovation_flow.profileId = '${profileID}'
      `
    );

    // Try challenge first
    const challengeInfo = await this.getNameableEntityInfo(
      'challenge',
      'innovationFlowId',
      innovationFlowInfo.entityID
    );
    if (challengeInfo) {
      const challengeUrlPath = await this.getChallengeUrlPath(
        'id',
        challengeInfo.entityID
      );
      return `${challengeUrlPath}/innovation-flow`;
    } else {
      // try Opportunity
      const opportunityInfo = await this.getNameableEntityInfo(
        'opportunity',
        'innovationFlowId',
        innovationFlowInfo.entityID
      );
      if (opportunityInfo) {
        const opportunityUrlPath = await this.getOpportunityUrlPath(
          'id',
          opportunityInfo.entityID
        );
        return `${opportunityUrlPath}/innovation-flow`;
      }
    }

    throw new EntityNotFoundException(
      `Unable to find innovationFlow for profile: ${profileID}`,
      LogContext.URL_GENERATOR
    );
  }

  private async getCalloutUrlPath(
    fieldName: string,
    fieldID: string
  ): Promise<string> {
    const [result]: {
      calloutId: string;
      calloutNameId: string;
      collaborationId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT callout.id as calloutId, callout.nameID as calloutNameId, callout.collaborationId as collaborationId FROM callout
        WHERE callout.${fieldName} = '${fieldID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find callout where ${fieldName}: ${fieldID}`,
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
    ID: string
  ): Promise<string> {
    let collaborationJourneyUrlPath = await this.getSpaceUrlPath(fieldName, ID);
    if (!collaborationJourneyUrlPath) {
      collaborationJourneyUrlPath = await this.getChallengeUrlPath(
        fieldName,
        ID
      );
    }
    if (!collaborationJourneyUrlPath) {
      collaborationJourneyUrlPath = await this.getOpportunityUrlPath(
        fieldName,
        ID
      );
    }
    if (!collaborationJourneyUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find url path for collaoboration: ${ID}`,
        LogContext.URL_GENERATOR
      );
    }
    return collaborationJourneyUrlPath;
  }

  private async getPostUrlPath(profileID: string): Promise<string> {
    const [result]: {
      postId: string;
      postNameId: string;
      calloutId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT post.id as postId, post.nameID as postNameId, post.calloutId as calloutId FROM post
        WHERE post.profileId = '${profileID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find post where profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const calloutUrlPath = await this.getCalloutUrlPath('id', result.calloutId);
    return `${calloutUrlPath}/${this.PATH_POSTS}/${result.postNameId}`;
  }

  private async getWhiteboardUrlPath(profileID: string): Promise<string> {
    const [result]: {
      whiteboardId: string;
      whiteboardNameId: string;
      calloutId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT whiteboard.id as whiteboardId, whiteboard.nameID as whiteboardNameId, whiteboard.calloutId as calloutId FROM whiteboard
        WHERE whiteboard.profileId = '${profileID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find whiteboard where profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    const calloutUrlPath = await this.getCalloutUrlPath('id', result.calloutId);
    return `${calloutUrlPath}/${this.PATH_WHITEBOARDS}/${result.whiteboardNameId}`;
  }
}
