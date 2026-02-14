import { RestrictedSpaceNames } from '@common/enums/restricted.space.names';
import { SpaceLevel } from '@common/enums/space.level';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { Organization } from '@domain/community/organization';
import { organizations } from '@domain/community/organization/organization.schema';
import { User } from '@domain/community/user/user.entity';
import { users } from '@domain/community/user/user.schema';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { innovationHubs } from '@domain/innovation-hub/innovation.hub.schema';
import { Space } from '@domain/space/space/space.entity';
import { spaces } from '@domain/space/space/space.schema';
import { Template } from '@domain/template/template/template.entity';
import { templates } from '@domain/template/template/template.schema';
import { CalendarEvent } from '@domain/timeline/event';
import { calendarEvents } from '@domain/timeline/event/event.schema';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { innovationPacks } from '@library/innovation-pack/innovation.pack.schema';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { discussions } from '@platform/forum-discussion/discussion.schema';
import { generateNameId } from '@services/infrastructure/naming/generate.name.id';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, ne, and, sql } from 'drizzle-orm';

export class NamingService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  public async getReservedNameIDsInLevelZeroSpace(
    levelZeroSpaceID: string
  ): Promise<string[]> {
    const subspaces = await this.db
      .select({ nameID: spaces.nameID })
      .from(spaces)
      .where(
        and(
          eq(spaces.levelZeroSpaceID, levelZeroSpaceID),
          ne(spaces.level, SpaceLevel.L0)
        )
      );
    return subspaces.map(s => s.nameID);
  }

  public async getReservedNameIDsLevelZeroSpaces(): Promise<string[]> {
    const levelZeroSpaces = await this.db
      .select({ nameID: spaces.nameID })
      .from(spaces)
      .where(eq(spaces.level, SpaceLevel.L0));
    const nameIDs = levelZeroSpaces.map(s => s.nameID.toLowerCase());

    return nameIDs.concat(RestrictedSpaceNames);
  }

  public async getReservedNameIDsInForum(forumID: string): Promise<string[]> {
    const discussionRecords = await this.db.query.discussions.findMany({
      where: eq(discussions.forumId, forumID),
      columns: {
        nameID: true,
      },
    });
    return discussionRecords?.map(d => d.nameID) || [];
  }

  public async getReservedNameIDsInCalloutsSet(
    calloutsSetID: string
  ): Promise<string[]> {
    const calloutRecords = await this.db.query.callouts.findMany({
      where: eq(callouts.calloutsSetId, calloutsSetID),
      columns: {
        nameID: true,
      },
    });
    return calloutRecords?.map(c => c.nameID) ?? [];
  }

  public async getReservedNameIDsInTemplatesSet(
    templatesSetID: string
  ): Promise<string[]> {
    const templateRecords = await this.db.query.templates.findMany({
      where: eq(templates.templatesSetId, templatesSetID),
      columns: {
        nameID: true,
      },
    });
    return templateRecords?.map(t => t.nameID) ?? [];
  }

  public async getReservedNameIDsInCalendar(
    calendarID: string
  ): Promise<string[]> {
    const events = await this.db.query.calendarEvents.findMany({
      where: eq(calendarEvents.calendarId, calendarID),
      columns: {
        nameID: true,
      },
    });
    return events?.map(e => e.nameID) ?? [];
  }

  public async getReservedNameIDsInInnovationPacks(): Promise<string[]> {
    const packs = await this.db
      .select({ nameID: innovationPacks.nameID })
      .from(innovationPacks);
    return packs.map(p => p.nameID);
  }

  public async getReservedNameIDsInHubs(): Promise<string[]> {
    const hubs = await this.db
      .select({ nameID: innovationHubs.nameID })
      .from(innovationHubs);
    return hubs.map(h => h.nameID);
  }

  public async getReservedNameIDsInUsers(): Promise<string[]> {
    const userRecords = await this.db.select({ nameID: users.nameID }).from(users);
    return userRecords.map(u => u.nameID);
  }

  public async getReservedNameIDsInVirtualContributors(): Promise<string[]> {
    const vcs = await this.db
      .select({ nameID: virtualContributors.nameID })
      .from(virtualContributors);
    return vcs.map(vc => vc.nameID);
  }

  public async getReservedNameIDsInOrganizations(): Promise<string[]> {
    const orgRecords = await this.db
      .select({ nameID: organizations.nameID })
      .from(organizations);
    return orgRecords.map(org => org.nameID);
  }

  public async getReservedNameIDsInCalloutContributions(
    calloutID: string
  ): Promise<string[]> {
    const calloutData = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutID),
      with: {
        contributions: {
          with: {
            whiteboard: {
              columns: {
                nameID: true,
              },
            },
            post: {
              columns: {
                nameID: true,
              },
            },
            memo: {
              columns: {
                nameID: true,
              },
            },
          },
        },
      },
    });
    const contributions = calloutData?.contributions || [];
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
    const discussionsWithDisplayName = await this.db.query.discussions.findFirst(
      {
        where: eq(discussions.forumId, forumID),
        with: {
          profile: true,
        },
      }
    );
    if (
      discussionsWithDisplayName &&
      discussionsWithDisplayName.profile?.displayName === displayName
    ) {
      return false;
    }

    return true;
  }

  async isInnovationHubSubdomainAvailable(subdomain: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(innovationHubs)
      .where(eq(innovationHubs.subdomain, subdomain));
    return (result[0]?.count ?? 0) === 0;
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
