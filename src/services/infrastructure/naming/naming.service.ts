import { RestrictedSpaceNames } from '@common/enums/restricted.space.names';
import { SpaceLevel } from '@common/enums/space.level';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { Space } from '@domain/space/space/space.entity';
import { Template } from '@domain/template/template/template.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { generateNameId } from '@services/infrastructure/naming/generate.name.id';
import { EntityManager, Not, Repository } from 'typeorm';

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
        level: Not(SpaceLevel.L0),
      },
      select: { id: true, nameID: true },
    });
    return subspaces.map(space => space.nameID);
  }

  public async getReservedNameIDsLevelZeroSpaces(): Promise<string[]> {
    const levelZeroSpaces = await this.entityManager.find(Space, {
      where: {
        level: SpaceLevel.L0,
      },
      select: { id: true, nameID: true },
    });
    const nameIDs = levelZeroSpaces.map(space => space.nameID.toLowerCase());

    return nameIDs.concat(RestrictedSpaceNames);
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

  public async getReservedNameIDsInInnovationPacks(): Promise<string[]> {
    const packs = await this.entityManager.find(InnovationPack, {
      select: {
        nameID: true,
      },
    });
    return packs.map(pack => pack.nameID);
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
      select: { id: true, nameID: true },
    });
    return users.map(user => user.nameID);
  }

  public async getReservedNameIDsInVirtualContributors(): Promise<string[]> {
    const vcs = await this.entityManager.find(VirtualContributor, {
      select: { id: true, nameID: true },
    });
    return vcs.map(vc => vc.nameID);
  }

  public async getReservedNameIDsInOrganizations(): Promise<string[]> {
    const organizations = await this.entityManager.find(Organization, {
      select: { id: true, nameID: true },
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
          memo: true,
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
      if (contribution.memo) {
        reservedNameIDs.push(contribution.memo.nameID);
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
}
