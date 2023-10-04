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
        const spaceNameID = await this.getNameableEntityNameIDFromProfileOrFail(
          'space',
          profile.id
        );
        return `${this.endpoint_cluster}/${spaceNameID}`;
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
        const userNameID = await this.getNameableEntityNameIDFromProfileOrFail(
          'user',
          profile.id
        );
        return `${this.endpoint_cluster}/${this.PATH_USER}/${userNameID}`;
      case ProfileType.ORGANIZATION:
        const organizationNameID =
          await this.getNameableEntityNameIDFromProfileOrFail(
            'organization',
            profile.id
          );
        return `${this.endpoint_cluster}/${this.PATH_ORGANIZATION}/${organizationNameID}`;
      case ProfileType.CALLOUT:
        return await this.getCalloutUrlPath('profileId', profile.id);
      case ProfileType.POST:
        return await this.getPostUrlPath(profile.id);
      case ProfileType.WHITEBOARD:
        return await this.getWhiteboardUrlPath(profile.id);
      case ProfileType.INNOVATION_FLOW:
        // Todo: fix
        return '';
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

  public async getNameableEntityNameIDFromProfileOrFail(
    entityTableName: string,
    profileID: string
  ): Promise<string> {
    const [result]: {
      entityId: string;
      nameID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityTableName}\`.\`id\` as \`entityId\`, \`${entityTableName}\`.\`nameID\` as nameID FROM \`${entityTableName}\`
        WHERE \`${entityTableName}\`.\`profileId\` = '${profileID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find nameable parent on entity type '${entityTableName}' for profile: ${profileID}`,
        LogContext.URL_GENERATOR
      );
    }
    return result.nameID;
  }

  private async getSpaceUrlPath(
    fieldName: string,
    ID: string
  ): Promise<string | undefined> {
    const [result]: {
      spaceId: string;
      spaceNameId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT space.id as spaceId, space.nameID as spaceNameId  FROM space
        WHERE space.${fieldName} = '${ID}'
      `
    );

    if (!result) {
      return undefined;
    }

    return `${this.endpoint_cluster}/${result.spaceNameId}`;
  }

  private async getChallengeUrlPath(
    fieldName: string,
    ID: string
  ): Promise<string | undefined> {
    const [result]: {
      challengeId: string;
      challengeNameId: string;
      spaceId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT challenge.id as challengeId, challenge.nameID as challengeNameId, challenge.spaceID as spaceId FROM challenge
        WHERE challenge.${fieldName} = '${ID}'
      `
    );

    if (!result) {
      return undefined;
    }

    const spaceUrlPath = await this.getSpaceUrlPath('id', result.spaceId);
    if (!spaceUrlPath) {
      throw new EntityNotFoundException(
        `Unable to find space for id: ${ID}`,
        LogContext.URL_GENERATOR
      );
    }
    return `${spaceUrlPath}/challenges/${result.challengeNameId}`;
  }

  private async getOpportunityUrlPath(
    fieldName: string,
    ID: string
  ): Promise<string | undefined> {
    const [result]: {
      opportunityId: string;
      opportunityNameId: string;
      challengeId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT opportunity.id as opportunityId, opportunity.nameID as opportunityNameId, opportunity.challengeId as challengeId FROM opportunity
        WHERE opportunity.${fieldName} = '${ID}'
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

  private async getCalloutUrlPath(
    fieldName: string,
    ID: string
  ): Promise<string> {
    const [result]: {
      calloutId: string;
      calloutNameId: string;
      collaborationId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT callout.id as calloutId, callout.nameID as calloutNameId, callout.collaborationId as collaborationId FROM callout
        WHERE callout.${fieldName} = '${ID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find callout where ${fieldName}: ${ID}`,
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
