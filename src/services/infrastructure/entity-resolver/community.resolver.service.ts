import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { Community, ICommunity } from '@domain/community/community';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { RoomType } from '@common/enums/room.type';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IAgent } from '@domain/agent';
import { IAccount } from '@domain/space/account/account.interface';

@Injectable()
export class CommunityResolverService {
  constructor(
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async getLevelZeroSpaceIdForCommunity(
    communityID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityID,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given community id: ${communityID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID;
  }

  async getCommunityForRoleSet(roleSetID: string): Promise<ICommunity> {
    const community = await this.entityManager.findOne(Community, {
      where: {
        roleSet: {
          id: roleSetID,
        },
      },
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for given RoleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return community;
  }

  public async getLevelZeroSpaceIdForCollaboration(
    collaborationID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given collaboration id: ${collaborationID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID;
  }

  public async getLevelZeroSpaceAgentForCommunityOrFail(
    communityID: string
  ): Promise<IAgent> {
    const levelZeroSpaceID =
      await this.getLevelZeroSpaceIdForCommunity(communityID);
    const levelZeroSpace = await this.entityManager.findOne(Space, {
      where: {
        id: levelZeroSpaceID,
      },
      relations: {
        agent: true,
      },
    });

    if (!levelZeroSpace || !levelZeroSpace.agent) {
      throw new EntityNotFoundException(
        `Unable to find Space for given community id: ${communityID}`,
        LogContext.COMMUNITY
      );
    }
    return levelZeroSpace.agent;
  }

  private async getAccountForCommunityOrFail(
    communityID: string
  ): Promise<IAccount> {
    const levelZeroSpaceID =
      await this.getLevelZeroSpaceIdForCommunity(communityID);
    const levelZeroSpace = await this.entityManager.findOne(Space, {
      where: {
        id: levelZeroSpaceID,
      },
      relations: {
        account: true,
      },
    });

    if (!levelZeroSpace || !levelZeroSpace.account) {
      throw new EntityNotFoundException(
        `Unable to find Account for given community id: ${communityID}`,
        LogContext.COMMUNITY
      );
    }
    return levelZeroSpace.account;
  }

  public async isCommunityAccountMatchingVcAccount(
    communityID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    const account = await this.getAccountForCommunityOrFail(communityID);

    const virtualContributorMatches = await this.entityManager.count(
      VirtualContributor,
      {
        where: {
          id: virtualContributorID,
          account: {
            id: account.id,
          },
        },
      }
    );
    if (virtualContributorMatches > 0) {
      return true;
    }
    return false;
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
    // check for whitebaord in contributions
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
    // check for whiteboard in framing
    if (!space) {
      space = await this.entityManager.findOne(Space, {
        where: {
          collaboration: {
            callouts: {
              framing: {
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

  public async getSpaceForRoleSetOrFail(roleSetID: string): Promise<ISpace> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          roleSet: {
            id: roleSetID,
          },
        },
      },
      relations: {
        profile: true,
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for community: ${roleSetID}`,
        LogContext.URL_GENERATOR
      );
    }
    return space;
  }

  public async getSpaceForCollaborationOrFail(
    collaborationID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
      relations: {
        ...options?.relations,
        profile: true,
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for collaboration: ${collaborationID}`,
        LogContext.SPACES
      );
    }
    return space;
  }

  public async getDisplayNameForRoleSetOrFail(
    roleSetID: string
  ): Promise<string> {
    const space = await this.getSpaceForRoleSetOrFail(roleSetID);
    return space.profile.displayName;
  }

  public async getCommunityFromCalloutRoomOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            comments: {
              id: commentsId,
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
        `Unable to find space for commentsId trough callout: ${commentsId}`,
        LogContext.URL_GENERATOR
      );
    }
    return space.community;
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
        `Unable to find space for commentsId trough post: ${commentsId}`,
        LogContext.COMMUNITY
      );
    }
    return space.community;
  }

  public async getCommunityFromRoom(
    id: string,
    roomType: RoomType
  ): Promise<ICommunity> {
    switch (roomType) {
      case RoomType.CALLOUT: {
        return this.getCommunityFromCalloutRoomOrFail(id);
      }
      case RoomType.POST: {
        return this.getCommunityFromPostRoomOrFail(id);
      }
      default: {
        throw new EntityNotFoundException(
          `Unable to find communnity for room of type: ${roomType}`,
          LogContext.COMMUNITY
        );
      }
    }
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
