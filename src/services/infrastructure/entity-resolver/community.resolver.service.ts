import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { EntityNotFoundException } from '@common/exceptions';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { ILicense } from '@domain/common/license/license.interface';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { communications } from '@domain/communication/communication/communication.schema';
import { ICommunity } from '@domain/community/community';
import { communities } from '@domain/community/community/community.schema';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { IAccount } from '@domain/space/account/account.interface';
import { spaces } from '@domain/space/space/space.schema';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, and, sql } from 'drizzle-orm';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { calloutsSets } from '@domain/collaboration/callouts-set/callouts.set.schema';
import { calloutFramings } from '@domain/collaboration/callout-framing/callout.framing.schema';
import { posts } from '@domain/collaboration/post/post.schema';
import { rooms } from '@domain/communication/room/room.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';

@Injectable()
export class CommunityResolverService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  public async getLevelZeroSpaceIdForRoleSet(
    roleSetID: string
  ): Promise<string> {
    // Find community with matching roleSet, then find the space
    const community = await this.db.query.communities.findFirst({
      where: eq(communities.roleSetId, roleSetID),
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Space for given roleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.communityId, community.id),
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given roleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID!;
  }

  public async getLevelZeroSpaceIdForCommunity(
    communityID: string
  ): Promise<string> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.communityId, communityID),
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given community id: ${communityID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID!;
  }

  async getCommunityForRoleSet(roleSetID: string): Promise<ICommunity> {
    const community = await this.db.query.communities.findFirst({
      where: eq(communities.roleSetId, roleSetID),
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for given RoleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return community as unknown as ICommunity;
  }

  async getCommunicationForRoleSet(roleSetID: string): Promise<ICommunication> {
    const community = await this.db.query.communities.findFirst({
      where: eq(communities.roleSetId, roleSetID),
      with: {
        communication: true,
      },
    });
    if (!community || !community.communication) {
      throw new EntityNotFoundException(
        `Unable to find Communication for given RoleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return community.communication as unknown as ICommunication;
  }

  public async getLevelZeroSpaceIdForCalloutsSet(
    calloutsSetID: string
  ): Promise<string> {
    // Find collaboration that owns this calloutsSet, then find the space
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetID),
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find Space for given calloutsSet id: ${calloutsSetID}`,
        LogContext.COMMUNITY
      );
    }
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given calloutsSet id: ${calloutsSetID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID!;
  }

  private async getAccountForRoleSetOrFail(
    roleSetID: string
  ): Promise<IAccount> {
    const levelZeroSpaceID =
      await this.getLevelZeroSpaceIdForRoleSet(roleSetID);
    const levelZeroSpace = await this.db.query.spaces.findFirst({
      where: eq(spaces.id, levelZeroSpaceID),
      with: {
        account: true,
      },
    });

    if (!levelZeroSpace || !levelZeroSpace.account) {
      throw new EntityNotFoundException(
        `Unable to find Account for given community id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return levelZeroSpace.account as unknown as IAccount;
  }

  public async isRoleSetAccountMatchingVcAccount(
    roleSetID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    const account = await this.getAccountForRoleSetOrFail(roleSetID);

    const vc = await this.db.query.virtualContributors.findFirst({
      where: and(
        eq(virtualContributors.id, virtualContributorID),
        eq(virtualContributors.accountId, account.id)
      ),
    });
    if (vc) {
      return true;
    }
    return false;
  }

  public async getCommunityFromUpdatesOrFail(
    updatesID: string
  ): Promise<ICommunity> {
    const communication = await this.db.query.communications.findFirst({
      where: eq(communications.updatesId, updatesID),
    });

    if (!communication) {
      throw new EntityNotFoundException(
        `Unable to find Community for Updates: ${updatesID}`,
        LogContext.COMMUNITY
      );
    }

    const community = await this.db.query.communities.findFirst({
      where: eq(communities.communicationId, communication.id),
    });

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for Updates: ${updatesID}`,
        LogContext.COMMUNITY
      );
    }

    return community as unknown as ICommunity;
  }

  public async getCommunityFromCollaborationCalloutOrFail(
    calloutId: string
  ): Promise<ICommunity> {
    // Find the callout, then traverse up: callout -> calloutsSet -> collaboration -> space -> community
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutId),
    });
    if (!callout?.calloutsSetId) {
      throw new EntityNotFoundException(
        `Unable to find space for callout: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, callout.calloutsSetId),
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find space for callout: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
      with: {
        community: true,
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for callout: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    const community = space.community;
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find community for callout: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    return community as unknown as ICommunity;
  }

  public async getCommunityFromWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ICommunity> {
    // check for whiteboard in contributions
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.whiteboardId, whiteboardId),
      with: {
        callout: true,
      },
    });
    let calloutsSetId: string | null = null;
    if (contribution?.callout?.calloutsSetId) {
      calloutsSetId = contribution.callout.calloutsSetId;
    }

    // check for whiteboard in framing
    if (!calloutsSetId) {
      const framing = await this.db.query.calloutFramings.findFirst({
        where: eq(calloutFramings.whiteboardId, whiteboardId),
      });
      if (framing) {
        const callout = await this.db.query.callouts.findFirst({
          where: eq(callouts.framingId, framing.id),
        });
        if (callout?.calloutsSetId) {
          calloutsSetId = callout.calloutsSetId;
        }
      }
    }

    if (!calloutsSetId) {
      throw new EntityNotFoundException(
        `Unable to find space for whiteboard: ${whiteboardId}`,
        LogContext.COMMUNITY
      );
    }

    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetId),
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find space for whiteboard: ${whiteboardId}`,
        LogContext.COMMUNITY
      );
    }

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
      with: {
        community: {
          with: {
            roleSet: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for whiteboard: ${whiteboardId}`,
        LogContext.COMMUNITY
      );
    }
    const community = space.community;
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find community for whiteboard: ${whiteboardId}`,
        LogContext.COMMUNITY
      );
    }
    return community as unknown as ICommunity;
  }

  public async getCommunityForMemoOrFail(memoId: string): Promise<ICommunity> {
    // check for memo in contributions
    let calloutsSetId: string | null = null;

    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.memoId, memoId),
      with: {
        callout: true,
      },
    });
    if (contribution?.callout?.calloutsSetId) {
      calloutsSetId = contribution.callout.calloutsSetId;
    }

    // check for memo in framing
    if (!calloutsSetId) {
      const framing = await this.db.query.calloutFramings.findFirst({
        where: eq(calloutFramings.memoId, memoId),
      });
      if (framing) {
        const callout = await this.db.query.callouts.findFirst({
          where: eq(callouts.framingId, framing.id),
        });
        if (callout?.calloutsSetId) {
          calloutsSetId = callout.calloutsSetId;
        }
      }
    }

    if (!calloutsSetId) {
      throw new EntityNotFoundException(
        'Unable to find Space for Memo',
        LogContext.COMMUNITY,
        { memoId }
      );
    }

    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetId),
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        'Unable to find Space for Memo',
        LogContext.COMMUNITY,
        { memoId }
      );
    }

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
      with: {
        community: true,
      },
    });

    if (!space) {
      throw new EntityNotFoundException(
        'Unable to find Space for Memo',
        LogContext.COMMUNITY,
        { memoId }
      );
    }
    const community = space.community;
    if (!community) {
      throw new EntityNotFoundException(
        'Unable to find Community for Space and Memo',
        LogContext.COMMUNITY,
        { spaceId: space.id, memoId }
      );
    }
    return community as unknown as ICommunity;
  }

  public async getCollaborationLicenseFromWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ILicense> {
    // check for whiteboard in contributions
    let calloutsSetId: string | null = null;
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.whiteboardId, whiteboardId),
      with: {
        callout: true,
      },
    });
    if (contribution?.callout?.calloutsSetId) {
      calloutsSetId = contribution.callout.calloutsSetId;
    }

    // check for whiteboard in framing
    if (!calloutsSetId) {
      const framing = await this.db.query.calloutFramings.findFirst({
        where: eq(calloutFramings.whiteboardId, whiteboardId),
      });
      if (framing) {
        const callout = await this.db.query.callouts.findFirst({
          where: eq(callouts.framingId, framing.id),
        });
        if (callout?.calloutsSetId) {
          calloutsSetId = callout.calloutsSetId;
        }
      }
    }

    if (!calloutsSetId) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration with License for whiteboard: ${whiteboardId}`,
        LogContext.COLLABORATION
      );
    }

    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetId),
      with: {
        license: {
          with: {
            entitlements: true,
          },
        },
      },
    });

    if (!collaboration || !collaboration.license) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration with License for whiteboard: ${whiteboardId}`,
        LogContext.COLLABORATION
      );
    }

    return collaboration.license as unknown as ILicense;
  }

  public async getCollaborationLicenseFromMemoOrFail(
    memoId: string
  ): Promise<ILicense> {
    // check for memo in contributions
    let calloutsSetId: string | null = null;
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.memoId, memoId),
      with: {
        callout: true,
      },
    });
    if (contribution?.callout?.calloutsSetId) {
      calloutsSetId = contribution.callout.calloutsSetId;
    }

    // check for memo in framing
    if (!calloutsSetId) {
      const framing = await this.db.query.calloutFramings.findFirst({
        where: eq(calloutFramings.memoId, memoId),
      });
      if (framing) {
        const callout = await this.db.query.callouts.findFirst({
          where: eq(callouts.framingId, framing.id),
        });
        if (callout?.calloutsSetId) {
          calloutsSetId = callout.calloutsSetId;
        }
      }
    }

    if (!calloutsSetId) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration with License for memo: ${memoId}`,
        LogContext.COLLABORATION
      );
    }

    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, calloutsSetId),
      with: {
        license: {
          with: {
            entitlements: true,
          },
        },
      },
    });

    if (!collaboration || !collaboration.license) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration with License for memo: ${memoId}`,
        LogContext.COLLABORATION
      );
    }

    return collaboration.license as unknown as ILicense;
  }

  public async getCommunityFromCalendarEventOrFail(
    calendarEventId: string
  ): Promise<ICommunity> {
    const [result] = await this.db.execute<{
      spaceId: string;
      communityId: string;
      entityType: string;
    }>(sql`
      SELECT "space"."id" as "spaceId", "space"."communityId" as "communityId", 'space' as "entityType" FROM "timeline"
      RIGHT JOIN "space" on "timeline"."id" = "space"."timelineID"
      JOIN "calendar" on "timeline"."calendarId" = "calendar"."id"
      JOIN "calendar_event" on "calendar"."id" = "calendar_event"."calendarId"
      WHERE "calendar_event"."id" = ${calendarEventId}
    `);

    if (!result?.communityId) {
      throw new EntityNotFoundException(
        `Unable to find Community for CalendarEvent with id: ${calendarEventId}`,
        LogContext.COMMUNITY
      );
    }

    const community = await this.db.query.communities.findFirst({
      where: eq(communities.id, result.communityId),
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community: ${result.communityId} for CalendarEvent with id: ${calendarEventId}`,
        LogContext.COMMUNITY
      );
    }
    return community as unknown as ICommunity;
  }

  public async getSpaceForRoleSetOrFail(roleSetID: string): Promise<ISpace> {
    const community = await this.db.query.communities.findFirst({
      where: eq(communities.roleSetId, roleSetID),
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find space for roleSet: ${roleSetID}`,
        LogContext.URL_GENERATOR
      );
    }
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.communityId, community.id),
      with: {
        about: {
          with: {
            profile: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for roleSet: ${roleSetID}`,
        LogContext.URL_GENERATOR
      );
    }
    return space as unknown as ISpace;
  }

  public async getSpaceForCommunityOrFail(
    communityID: string
  ): Promise<ISpace> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.communityId, communityID),
      with: {
        about: {
          with: {
            profile: true,
          },
        },
        community: {
          with: {
            roleSet: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for Community: ${communityID}`,
        LogContext.URL_GENERATOR
      );
    }
    return space as unknown as ISpace;
  }

  public async getSpaceForCollaborationOrFail(
    collaborationID: string
  ): Promise<ISpace> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaborationID),
      with: {
        about: {
          with: {
            profile: true,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for collaboration: ${collaborationID}`,
        LogContext.SPACES
      );
    }
    return space as unknown as ISpace;
  }

  public async getDisplayNameForRoleSetOrFail(
    roleSetID: string
  ): Promise<string> {
    const space = await this.getSpaceForRoleSetOrFail(roleSetID);
    return space.about.profile.displayName;
  }

  public async getCommunityFromCollaborationCalloutRoomOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    // Find callout by comments room ID, then traverse up to space/community
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.commentsId, commentsId),
    });
    if (!callout?.calloutsSetId) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough callout: ${commentsId}`,
        LogContext.URL_GENERATOR
      );
    }
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, callout.calloutsSetId),
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough callout: ${commentsId}`,
        LogContext.URL_GENERATOR
      );
    }
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
      with: {
        community: {
          with: {
            roleSet: true,
          },
        },
      },
    });
    if (!space || !space.community) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough callout: ${commentsId}`,
        LogContext.URL_GENERATOR
      );
    }
    return space.community as unknown as ICommunity;
  }

  public async getCommunityFromPostRoomOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    // Find post by comments room ID, then traverse up to callout -> calloutsSet -> collaboration -> space
    const post = await this.db.query.posts.findFirst({
      where: eq(posts.commentsId, commentsId),
    });
    if (!post) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough post: ${commentsId}`,
        LogContext.COMMUNITY
      );
    }
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.postId, post.id),
      with: {
        callout: true,
      },
    });
    if (!contribution?.callout?.calloutsSetId) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough post: ${commentsId}`,
        LogContext.COMMUNITY
      );
    }
    const collaboration = await this.db.query.collaborations.findFirst({
      where: eq(collaborations.calloutsSetId, contribution.callout.calloutsSetId),
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough post: ${commentsId}`,
        LogContext.COMMUNITY
      );
    }
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaboration.id),
      with: {
        community: {
          with: {
            roleSet: true,
          },
        },
      },
    });
    if (!space || !space.community) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId trough post: ${commentsId}`,
        LogContext.COMMUNITY
      );
    }
    return space.community as unknown as ICommunity;
  }

  public async getCommunityFromRoom(
    id: string,
    roomType: RoomType
  ): Promise<ICommunity> {
    switch (roomType) {
      case RoomType.CALLOUT: {
        return this.getCommunityFromCollaborationCalloutRoomOrFail(id);
      }
      case RoomType.POST: {
        return this.getCommunityFromPostRoomOrFail(id);
      }
      default: {
        throw new EntityNotFoundException(
          `Unable to find community for room of type: ${roomType}`,
          LogContext.COMMUNITY
        );
      }
    }
  }
}
