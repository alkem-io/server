import { EntityManager, Not, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { NameID, UUID } from '@domain/common/scalars';
import { Post } from '@domain/collaboration/post/post.entity';
import { LogContext } from '@common/enums';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CalendarEvent, ICalendarEvent } from '@domain/timeline/event';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { ICallout } from '@domain/collaboration/callout';
import { NAMEID_LENGTH } from '@common/constants';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Space } from '@domain/space/space/space.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

export class NamingService {
  replaceSpecialCharacters = require('replace-special-characters');

  constructor(
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(InnovationHub)
    private innovationHubRepository: Repository<InnovationHub>,
    @InjectRepository(CalloutContribution)
    private contributionRepository: Repository<CalloutContribution>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async isNameIdAvailableInAccount(
    nameID: string,
    accountID: string
  ): Promise<boolean> {
    if (!nameID) return true;

    const spaceCount = await this.spaceRepository.countBy({
      nameID: nameID,
      account: {
        id: accountID,
      },
      level: Not(0),
    });
    if (spaceCount > 0) return false;
    return true;
  }

  async isPostNameIdAvailableInCallout(
    nameID: string,
    calloutID: string
  ): Promise<boolean> {
    const query = this.contributionRepository
      .createQueryBuilder('callout_contribution')
      .leftJoinAndSelect('callout_contribution.callout', 'callout')
      .leftJoinAndSelect('callout_contribution.post', 'post')
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
    const query = this.contributionRepository
      .createQueryBuilder('callout_contribution')
      .leftJoinAndSelect('callout_contribution.whiteboard', 'whiteboard')
      .leftJoinAndSelect('callout_contribution.callout', 'callout')
      .where('callout.id = :id')
      .andWhere('whiteboard.nameID= :nameID')
      .setParameters({ id: `${calloutID}`, nameID: `${nameID}` });
    const whiteboardWithNameID = await query.getOne();
    if (whiteboardWithNameID) {
      return false;
    }

    return true;
  }

  public async getReservedNameIDsInCollaboration(
    collaborationID: string
  ): Promise<string[]> {
    const callouts = await this.entityManager.find(Callout, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
      select: ['nameID'],
    });
    const nameIDs = callouts.map(callout => callout.nameID);
    return nameIDs;
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

  createNameIdAvoidingReservedNameIDs(
    base: string,
    reservedNameIDs: string[]
  ): string {
    let result = this.createNameID(base, false);
    let count = 1;
    while (reservedNameIDs.includes(result)) {
      // If the nameID is already reserved, try again with a new random suffix starting from 1 but with two digits
      result = this.createNameID(`${base}-${count.toString()}`, false);
      count++;
    }
    return result;
  }

  async getCommunityPolicyWithSettingsForCollaboration(
    collaborationID: string
  ): Promise<ICommunityPolicy> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
      relations: {
        community: {
          policy: true,
        },
      },
    });
    if (!space || !space.community || !space.community.policy) {
      throw new EntityNotInitializedException(
        `Unable to load all entities for space with collaboration ${collaborationID}`,
        LogContext.COMMUNITY
      );
    }
    // Directly parse the settings string to avoid the need to load the settings service
    const policy = space.community.policy;
    const settings: ISpaceSettings = JSON.parse(space.settingsStr);
    policy.settings = settings;
    return policy;
  }

  async getCommunityPolicyWithSettingsForCallout(
    calloutID: string
  ): Promise<ICommunityPolicy> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            id: calloutID,
          },
        },
      },
      relations: {
        community: {
          policy: true,
        },
      },
    });
    if (!space || !space.community || !space.community.policy) {
      throw new EntityNotInitializedException(
        `Unable to load all entities for space with callout ${calloutID}`,
        LogContext.COMMUNITY
      );
    }

    // Directly parse the settings string to avoid the need to load the settings service
    const policy = space.community.policy;
    const settings: ISpaceSettings = JSON.parse(space.settingsStr);
    policy.settings = settings;

    return policy;
  }

  async getPostForRoom(roomID: string): Promise<IPost> {
    const result = await this.entityManager.findOne(Post, {
      where: {
        comments: { id: roomID },
      },
      relations: { profile: true },
    });
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Post for Room: : ${roomID}`,
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
      relations: { profile: true, comments: true },
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
      relations: { profile: true, comments: true },
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
