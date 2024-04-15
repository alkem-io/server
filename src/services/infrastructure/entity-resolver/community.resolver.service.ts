import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community, ICommunity } from '@domain/community/community';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';

@Injectable()
export class CommunityResolverService {
  constructor(
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async getRootSpaceIDFromCommunityOrFail(
    community: ICommunity
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: community.id,
        },
      },
      relations: {
        account: {
          space: true,
        },
      },
    });
    if (space && space.account && space.account.space) {
      return space.account.space.id;
    }

    throw new EntityNotFoundException(
      `Unable to find Space for given community id: ${community.id}`,
      LogContext.COLLABORATION
    );
  }

  public async getCommunityFromDiscussionOrFail(
    discussionID: string
  ): Promise<ICommunity> {
    const discussion = await this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.communication', 'communication')
      .where('discussion.id = :id')
      .setParameters({ id: `${discussionID}` })
      .getOne();

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .where('communicationId = :id')
      .setParameters({ id: `${discussion?.communication?.id}` })
      .getOne();

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for Discussion: ${discussionID}`,
        LogContext.COMMUNITY
      );
    }

    return community;
  }

  public async getCommunityFromUpdatesOrFail(
    updatesID: string
  ): Promise<ICommunity> {
    const communication = await this.communicationRepository
      .createQueryBuilder('communication')
      .leftJoinAndSelect('communication.updates', 'updates')
      .where('updates.id = :id')
      .setParameters({ id: `${updatesID}` })
      .getOne();

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .where('communicationId = :id')
      .setParameters({ id: `${communication?.id}` })
      .getOne();

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for Updates: ${updatesID}`,
        LogContext.COMMUNITY
      );
    }

    return community;
  }

  public async getCommunityFromCalloutOrFail(
    calloutId: string
  ): Promise<ICommunity> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            id: calloutId,
          },
        },
      },
      relations: {
        community: true,
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for whiteboard: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    const community = space.community;
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find community for whiteboard: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    return community;
  }

  public async getCommunityFromWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ICommunity> {
    let space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            contributions: {
              whiteboard: {
                id: whiteboardId,
              },
            },
          },
        },
      },
      relations: {
        community: true,
      },
    });
    if (!space) {
      space = await this.entityManager.findOne(Space, {
        where: {
          collaboration: {
            callouts: {
              contributions: {
                whiteboard: {
                  id: whiteboardId,
                },
              },
            },
          },
        },
        relations: {
          community: true,
        },
      });
    }
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
    return community;
  }

  public async getCommunityFromCalendarEventOrFail(
    callendarEventId: string
  ): Promise<ICommunity> {
    const [result]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`space\`.\`id\` as \`spaceId\`, \`space\`.\`communityId\` as communityId, 'space' as \`entityType\` FROM \`timeline\`
        RIGHT JOIN \`space\` on \`timeline\`.\`id\` = \`space\`.\`timelineID\`
        JOIN \`calendar\` on \`timeline\`.\`calendarId\` = \`calendar\`.\`id\`
        JOIN \`calendar_event\` on \`calendar\`.\`id\` = \`calendar_event\`.\`calendarId\`
        WHERE \`calendar_event\`.\`id\` = '${callendarEventId}';
      `
    );

    const community = await this.communityRepository.findOneBy({
      id: result.communityId,
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community: ${result.communityId} for CalendarEvent with id: ${callendarEventId}`,
        LogContext.COMMUNITY
      );
    }
    return community;
  }

  public async getSpaceForCommunityOrFail(
    communityId: string
  ): Promise<ISpace> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityId,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for community: ${communityId}`,
        LogContext.URL_GENERATOR
      );
    }
    return space;
  }

  public async getDisplayNameForCommunityOrFail(
    communityId: string
  ): Promise<string> {
    const space = await this.getSpaceForCommunityOrFail(communityId);
    return space.profile.displayName;
  }

  public async getCommunityFromPostRoomOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            contributions: {
              post: {
                comments: {
                  id: commentsId,
                },
              },
            },
          },
        },
      },
      relations: {
        community: true,
      },
    });
    if (!space || !space.community) {
      throw new EntityNotFoundException(
        `Unable to find space for commentsId: ${commentsId}`,
        LogContext.URL_GENERATOR
      );
    }
    return space.community;
  }

  public async getCommunityWithParentOrFail(
    communityID: string
  ): Promise<ICommunity> {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.parentCommunity', 'parentCommunity')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community with parent: ${communityID}`,
        LogContext.NOTIFICATIONS
      );
    }
    return community;
  }
}
