import { EntityManager, Not, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { ICallout } from '@domain/collaboration/callout';
import { NAMEID_LENGTH } from '@common/constants';
import { Space } from '@domain/space/space/space.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { User } from '@domain/community/user/user.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor';
import { Organization } from '@domain/community/organization';

export class NamingService {
  replaceSpecialCharacters = require('replace-special-characters');

  constructor(
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(InnovationHub)
    private innovationHubRepository: Repository<InnovationHub>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getReservedNameIDsInAccount(
    accountID: string
  ): Promise<string[]> {
    const subspaces = await this.entityManager.find(Space, {
      where: {
        account: {
          id: accountID,
        },
        level: Not(SpaceLevel.SPACE),
      },
      select: {
        nameID: true,
      },
    });
    const nameIDs = subspaces.map(space => space.nameID);
    return nameIDs;
  }

  public async getReservedNameIDsInCommunication(
    communicationID: string
  ): Promise<string[]> {
    const discussions = await this.entityManager.find(Discussion, {
      where: {
        communication: {
          id: communicationID,
        },
      },
      select: {
        nameID: true,
      },
    });
    const nameIDs = discussions?.map(discussion => discussion.nameID) || [];
    return nameIDs;
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
      select: {
        nameID: true,
      },
    });
    const nameIDs = callouts?.map(callout => callout.nameID) || [];
    return nameIDs;
  }

  public async getReservedNameIDsInCalendar(
    calendarID: string
  ): Promise<string[]> {
    const events = await this.entityManager.find(CalendarEvent, {
      where: {
        calendar: {
          id: calendarID,
        },
      },
      select: {
        nameID: true,
      },
    });
    const nameIDs = events?.map(event => event.nameID) || [];
    return nameIDs;
  }

  public async getReservedNameIDsInLibrary(
    libraryID: string
  ): Promise<string[]> {
    const innovationPacks = await this.entityManager.find(InnovationPack, {
      where: {
        library: {
          id: libraryID,
        },
      },
      select: {
        nameID: true,
      },
    });
    const nameIDs = innovationPacks?.map(pack => pack.nameID) || [];
    return nameIDs;
  }

  public async getReservedNameIDsInHubs(): Promise<string[]> {
    const hubs = await this.entityManager.find(InnovationHub, {
      select: {
        nameID: true,
      },
    });
    const nameIDs = hubs.map(hub => hub.nameID);
    return nameIDs;
  }

  public async getReservedNameIDsInUsers(): Promise<string[]> {
    const users = await this.entityManager.find(User, {
      select: {
        nameID: true,
      },
    });
    const nameIDs = users.map(user => user.nameID);
    return nameIDs;
  }

  public async getReservedNameIDsInVirtualContributors(): Promise<string[]> {
    const vcs = await this.entityManager.find(VirtualContributor, {
      select: {
        nameID: true,
      },
    });
    const nameIDs = vcs.map(vc => vc.nameID);
    return nameIDs;
  }

  public async getReservedNameIDsInOrganizations(): Promise<string[]> {
    const organizations = await this.entityManager.find(Organization, {
      select: {
        nameID: true,
      },
    });
    const nameIDs = organizations.map(organization => organization.nameID);
    return nameIDs;
  }

  public async getReservedNameIDsInCalloutContributions(
    calloutID: string
  ): Promise<string[]> {
    const callout = await this.entityManager.findOne(Callout, {
      where: {
        id: calloutID,
      },
      relations: {
        contributions: {
          whiteboard: true,
          post: true,
        },
      },
      select: ['contributions'],
    });
    const contributions = callout?.contributions || [];
    const reservedNameIDs: string[] = [];
    for (const contribution of contributions) {
      if (contribution.whiteboard) {
        reservedNameIDs.push(contribution.whiteboard.nameID);
      }
      if (contribution.post) {
        reservedNameIDs.push(contribution.post.nameID);
      }
    }
    return reservedNameIDs;
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

  public createNameID(base: string): string {
    const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;

    const baseMaxLength = base.slice(0, NAMEID_LENGTH);
    // replace spaces + trim to NAMEID_LENGTH characters
    const nameID = `${baseMaxLength}`.replace(/\s/g, '');
    // replace characters with umlouts etc to normal characters
    const nameIDNoSpecialCharacters: string =
      this.replaceSpecialCharacters(nameID);
    // Remove any characters that are not allowed
    return nameIDNoSpecialCharacters
      .replace(nameIDExcludedCharacters, '')
      .toLowerCase()
      .slice(0, NAMEID_LENGTH);
  }

  public createNameIdAvoidingReservedNameIDs(
    base: string,
    reservedNameIDs: string[]
  ): string {
    const guess = this.createNameID(base);
    let result = guess;
    let count = 1;
    while (reservedNameIDs.includes(result)) {
      // If the nameID is already reserved, try again with a new random suffix starting from 1 but with two digits
      result = `${guess}-${count.toString()}`;
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
