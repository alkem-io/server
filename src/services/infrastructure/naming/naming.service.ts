import { EntityManager, Not, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Post } from '@domain/collaboration/post/post.entity';
import { LogContext } from '@common/enums';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { IPost } from '@domain/collaboration/post/post.interface';
import { CalendarEvent, ICalendarEvent } from '@domain/timeline/event';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { ICallout } from '@domain/collaboration/callout';
import { Space } from '@domain/space/space/space.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Organization } from '@domain/community/organization';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { SpaceReservedName } from '@common/enums/space.reserved.name';
import { generateNameId } from '@services/infrastructure/naming/generate.name.id';
import { Template } from '@domain/template/template/template.entity';
import { IRoleSet } from '@domain/access/role-set';

export class NamingService {
  constructor(
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(InnovationHub)
    private innovationHubRepository: Repository<InnovationHub>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async getReservedNameIDsInLevelZeroSpace(
    levelZeroSpaceID: string
  ): Promise<string[]> {
    const subspaces = await this.entityManager.find(Space, {
      where: {
        levelZeroSpaceID: levelZeroSpaceID,
        level: Not(SpaceLevel.SPACE),
      },
      select: {
        nameID: true,
      },
    });
    return subspaces.map(space => space.nameID);
  }

  public async getReservedNameIDsLevelZeroSpaces(): Promise<string[]> {
    const levelZeroSpaces = await this.entityManager.find(Space, {
      where: {
        level: SpaceLevel.SPACE,
      },
      select: {
        nameID: true,
      },
    });
    const nameIDs = levelZeroSpaces.map(space => space.nameID.toLowerCase());
    const reservedTopLevelSpaces = Object.values(SpaceReservedName) as string[];

    return nameIDs.concat(reservedTopLevelSpaces);
  }

  public async getReservedNameIDsInForum(forumID: string): Promise<string[]> {
    const discussions = await this.entityManager.find(Discussion, {
      where: {
        forum: {
          id: forumID,
        },
      },
      select: {
        nameID: true,
      },
    });
    return discussions?.map(discussion => discussion.nameID) || [];
  }

  public async getReservedNameIDsInCalloutsSet(
    calloutsSetID: string
  ): Promise<string[]> {
    const callouts = await this.entityManager.find(Callout, {
      where: {
        calloutsSet: {
          id: calloutsSetID,
        },
      },
      select: {
        nameID: true,
      },
    });
    return callouts?.map(callout => callout.nameID) ?? [];
  }

  public async getReservedNameIDsInTemplatesSet(
    templatesSetID: string
  ): Promise<string[]> {
    const templates = await this.entityManager.find(Template, {
      where: {
        templatesSet: {
          id: templatesSetID,
        },
      },
      select: {
        nameID: true,
      },
    });
    return templates?.map(template => template.nameID) ?? [];
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
    return events?.map(event => event.nameID) ?? [];
  }

  public async getReservedNameIDsInHubs(): Promise<string[]> {
    const hubs = await this.entityManager.find(InnovationHub, {
      select: {
        nameID: true,
      },
    });
    return hubs.map(hub => hub.nameID);
  }

  public async getReservedNameIDsInUsers(): Promise<string[]> {
    const users = await this.entityManager.find(User, {
      select: {
        nameID: true,
      },
    });
    return users.map(user => user.nameID);
  }

  public async getReservedNameIDsInVirtualContributors(): Promise<string[]> {
    const vcs = await this.entityManager.find(VirtualContributor, {
      select: {
        nameID: true,
      },
    });
    return vcs.map(vc => vc.nameID);
  }

  public async getReservedNameIDsInOrganizations(): Promise<string[]> {
    const organizations = await this.entityManager.find(Organization, {
      select: {
        nameID: true,
      },
    });
    return organizations.map(organization => organization.nameID);
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

  async isDiscussionDisplayNameAvailableInForum(
    displayName: string,
    forumID: string
  ): Promise<boolean> {
    const query = this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.forum', 'forum')
      .leftJoinAndSelect('discussion.profile', 'profile')
      .where('forum.id = :id')
      .andWhere('profile.displayName = :displayName')
      .setParameters({
        id: `${forumID}`,
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
    return innovationHubsCount === 0;
  }

  private createNameID(base: string): string {
    return generateNameId(base);
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

  async getRoleSetAndSettingsForCollaborationCalloutsSet(
    calloutsSetID: string
  ): Promise<{
    roleSet: IRoleSet;
    spaceSettings: ISpaceSettings;
  }> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            id: calloutsSetID,
          },
        },
      },
      relations: {
        community: {
          roleSet: true,
        },
      },
    });
    if (!space || !space.community || !space.community.roleSet) {
      throw new EntityNotInitializedException(
        `Unable to load all entities for roleSet + settings for collaboration ${calloutsSetID}`,
        LogContext.COMMUNITY
      );
    }
    // Directly parse the settings string to avoid the need to load the settings service
    const roleSet = space.community.roleSet;
    const spaceSettings: ISpaceSettings = space.settings;
    return { roleSet, spaceSettings };
  }

  async getRoleSetAndSettingsForCallout(calloutID: string): Promise<{
    roleSet?: IRoleSet;
    spaceSettings?: ISpaceSettings;
  }> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              id: calloutID,
            },
          },
        },
      },
      relations: {
        community: {
          roleSet: true,
        },
      },
    });
    // if (!space || !space.community || !space.community.roleSet) {
    //   throw new EntityNotInitializedException(
    //     `Unable to load all entities for space with callout ${calloutID}`,
    //     LogContext.COMMUNITY
    //   );
    // }

    // Directly parse the settings string to avoid the need to load the settings service
    const roleSet = space?.community?.roleSet;
    const spaceSettings = space?.settings;

    return { roleSet: roleSet, spaceSettings };
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
