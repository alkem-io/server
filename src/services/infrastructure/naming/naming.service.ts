import { EntityManager, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { NameID, UUID } from '@domain/common/scalars';
import { Post } from '@domain/collaboration/post/post.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { LogContext } from '@common/enums';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Community } from '@domain/community/community';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CalendarEvent, ICalendarEvent } from '@domain/timeline/event';
import { Collaboration } from '@domain/collaboration/collaboration';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { ICallout } from '@domain/collaboration/callout';
import { NAMEID_LENGTH } from '@common/constants';

export class NamingService {
  replaceSpecialCharacters = require('replace-special-characters');

  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(InnovationHub)
    private innovationHubRepository: Repository<InnovationHub>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async isNameIdAvailableInSpace(
    nameID: string,
    spaceID: string
  ): Promise<boolean> {
    if (!nameID) return true;

    const challengeCount = await this.challengeRepository.countBy({
      nameID: nameID,
      spaceID: spaceID,
    });
    if (challengeCount > 0) return false;
    const opportunityCount = await this.opportunityRepository.countBy({
      nameID: nameID,
      spaceID: spaceID,
    });
    if (opportunityCount > 0) return false;
    const projectCount = await this.projectRepository.countBy({
      nameID: nameID,
      spaceID: spaceID,
    });
    if (projectCount > 0) return false;
    return true;
  }

  async isPostNameIdAvailableInCallout(
    nameID: string,
    calloutID: string
  ): Promise<boolean> {
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.callout', 'callout')
      .where('callout.id = :id')
      .andWhere('post.nameID= :nameID')
      .setParameters({ id: `${calloutID}`, nameID: `${nameID}` });
    const postWithNameID = await query.getOne();
    if (postWithNameID) {
      return false;
    }

    return true;
  }

  async isWhiteboardNameIdAvailableInCallout(
    nameID: string,
    calloutID: string
  ): Promise<boolean> {
    const query = this.whiteboardRepository
      .createQueryBuilder('whiteboard')
      .leftJoinAndSelect('whiteboard.callout', 'callout')
      .where('callout.id = :id')
      .andWhere('whiteboard.nameID= :nameID')
      .setParameters({ id: `${calloutID}`, nameID: `${nameID}` });
    const whiteboardWithNameID = await query.getOne();
    if (whiteboardWithNameID) {
      return false;
    }

    return true;
  }

  async isCalloutNameIdAvailableInCollaboration(
    nameID: string,
    collaborationID: string
  ): Promise<boolean> {
    const query = this.calloutRepository
      .createQueryBuilder('callout')
      .leftJoinAndSelect('callout.collaboration', 'collaboration')
      .where('collaboration.id = :id')
      .andWhere('callout.nameID= :nameID')
      .setParameters({ id: `${collaborationID}`, nameID: `${nameID}` });
    const calloutsWithNameID = await query.getOne();
    if (calloutsWithNameID) {
      return false;
    }

    return true;
  }

  async isCalloutDisplayNameAvailableInCollaboration(
    displayName: string,
    collaborationID: string
  ): Promise<boolean> {
    const query = this.calloutRepository
      .createQueryBuilder('callout')
      .leftJoinAndSelect('callout.collaboration', 'collaboration')
      .leftJoinAndSelect('callout.framing', 'framing')
      .leftJoinAndSelect('framing.profile', 'profile')
      .where('collaboration.id = :id')
      .andWhere('profile.displayName = :displayName')
      .setParameters({
        id: `${collaborationID}`,
        displayName: `${displayName}`,
      });
    const calloutsWithDisplayName = await query.getOne();
    if (calloutsWithDisplayName) {
      return false;
    }

    return true;
  }

  private async getCollaborationIdForCallout(
    calloutID: string
  ): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Callout with ID: ${calloutID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  async isDiscussionDisplayNameAvailableInCommunication(
    displayName: string,
    communicationID: string
  ): Promise<boolean> {
    const query = this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.communication', 'communication')
      .leftJoinAndSelect('discussion.profile', 'profile')
      .where('communication.id = :id')
      .andWhere('profile.displayName = :displayName')
      .setParameters({
        id: `${communicationID}`,
        displayName: `${displayName}`,
      });
    const discussionsWithDisplayName = await query.getOne();
    if (discussionsWithDisplayName) {
      return false;
    }

    return true;
  }

  async isInnovationHubSubdomainAvailable(subdomain: string): Promise<boolean> {
    const innovationHubsCount = await this.innovationHubRepository.countBy({
      subdomain: subdomain,
    });
    if (innovationHubsCount > 0) return false;
    return true;
  }

  async isInnovationHubNameIdAvailable(nameID: string): Promise<boolean> {
    const innovationHubsCount = await this.innovationHubRepository.countBy({
      nameID: nameID,
    });
    if (innovationHubsCount > 0) return false;
    return true;
  }

  isValidNameID(nameID: string): boolean {
    if (nameID.length > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(nameID);
  }

  isValidUUID(uuid: string): boolean {
    if (uuid.length != UUID.LENGTH) return false;
    return UUID.REGEX.test(uuid);
  }

  async getCommunityIdFromCollaborationId(collaborationID: string) {
    const [result]: {
      communityId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT communityId from \`space\`
        WHERE \`space\`.\`collaborationId\` = '${collaborationID}' UNION

        SELECT communityId from \`challenge\`
        WHERE \`challenge\`.\`collaborationId\` = '${collaborationID}' UNION

        SELECT communityId from \`opportunity\`
        WHERE \`opportunity\`.\`collaborationId\` = '${collaborationID}';
      `
    );
    return result.communityId;
  }

  createNameID(base: string, useRandomSuffix = true): string {
    const NAMEID_SUFFIX_LENGTH = 5;
    const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
    let randomSuffix = '';
    if (useRandomSuffix) {
      const randomNumber = Math.floor(
        Math.random() * Math.pow(10, NAMEID_SUFFIX_LENGTH - 1)
      ).toString();
      randomSuffix = `-${randomNumber}`;
    }
    const baseMaxLength = base.slice(0, NAMEID_LENGTH - NAMEID_SUFFIX_LENGTH);
    // replace spaces + trim to NAMEID_LENGTH characters
    const nameID = `${baseMaxLength}${randomSuffix}`.replace(/\s/g, '');
    // replace characters with umlouts etc to normal characters
    const nameIDNoSpecialCharacters: string =
      this.replaceSpecialCharacters(nameID);
    // Remove any characters that are not allowed
    return nameIDNoSpecialCharacters
      .replace(nameIDExcludedCharacters, '')
      .toLowerCase()
      .slice(0, NAMEID_LENGTH);
  }

  async getCommunityPolicyForCollaboration(
    collaborationID: string
  ): Promise<ICommunityPolicy> {
    const communityID = await this.getCommunityIdFromCollaborationId(
      collaborationID
    );

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.policy', 'policy')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (!community || !community.policy)
      throw new EntityNotInitializedException(
        `Unable to load policy for community ${communityID} not initialized!`,
        LogContext.COMMUNITY
      );

    return community.policy;
  }

  async getCommunityPolicyForCallout(
    calloutID: string
  ): Promise<ICommunityPolicy> {
    const collaborationID = await this.getCollaborationIdForCallout(calloutID);
    const communityID = await this.getCommunityIdFromCollaborationId(
      collaborationID
    );

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.policy', 'policy')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (!community || !community.policy)
      throw new EntityNotInitializedException(
        `Unable to load policy for community ${communityID} not initialized!`,
        LogContext.COMMUNITY
      );

    return community.policy;
  }

  async getPostForRoom(commentsID: string): Promise<IPost> {
    const result = await this.entityManager.findOne(Post, {
      where: {
        comments: { id: commentsID },
      },
      relations: ['profile'],
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Post for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  async getCalloutForRoom(commentsID: string): Promise<ICallout> {
    const result = await this.entityManager.findOne(Callout, {
      where: {
        comments: { id: commentsID },
      },
      relations: ['profile'],
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  async getCalendarEventForRoom(commentsID: string): Promise<ICalendarEvent> {
    const result = await this.entityManager.findOne(CalendarEvent, {
      where: {
        comments: { id: commentsID },
      },
      relations: ['profile', 'comments'],
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify CalendarEvent for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }

  async getDiscussionForRoom(commentsID: string): Promise<IDiscussion> {
    // check if this is a comment related to an calendar
    const result = await this.entityManager.findOne(Discussion, {
      where: {
        comments: { id: commentsID },
      },
      relations: ['profile', 'comments'],
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Discussion for Room: : ${commentsID}`,
        LogContext.COLLABORATION
      );
    }
    return result;
  }
}
