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
import { IAccount } from '@domain/space/account/account.interface';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { Collaboration } from '@domain/collaboration/collaboration';

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

  public async getLevelZeroSpaceIdForRoleSet(
    roleSetID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          roleSet: {
            id: roleSetID,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given roleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID;
  }

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

  async getCommunicationForRoleSet(roleSetID: string): Promise<ICommunication> {
    const community = await this.entityManager.findOne(Community, {
      where: {
        roleSet: {
          id: roleSetID,
        },
      },
      relations: {
        communication: true,
      },
    });
    if (!community || !community.communication) {
      throw new EntityNotFoundException(
        `Unable to find Communication for given RoleSet id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return community.communication;
  }

  public async getLevelZeroSpaceIdForCalloutsSet(
    calloutsSetID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            id: calloutsSetID,
          },
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for given calloutsSet id: ${calloutsSetID}`,
        LogContext.COMMUNITY
      );
    }
    return space.levelZeroSpaceID;
  }

  private async getAccountForRoleSetOrFail(
    roleSetID: string
  ): Promise<IAccount> {
    const levelZeroSpaceID =
      await this.getLevelZeroSpaceIdForRoleSet(roleSetID);
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
        `Unable to find Account for given community id: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    }
    return levelZeroSpace.account;
  }

  public async isRoleSetAccountMatchingVcAccount(
    roleSetID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    const account = await this.getAccountForRoleSetOrFail(roleSetID);

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

  public async getCommunityFromCollaborationCalloutOrFail(
    calloutId: string
  ): Promise<ICommunity> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              id: calloutId,
            },
          },
        },
      },
      relations: {
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
    return community;
  }

  public async getCommunityFromWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ICommunity> {
    // check for whiteboard in contributions
    let space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              contributions: {
                whiteboard: {
                  id: whiteboardId,
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
    // check for whiteboard in framing
    if (!space) {
      space = await this.entityManager.findOne(Space, {
        where: {
          collaboration: {
            calloutsSet: {
              callouts: {
                framing: {
                  whiteboard: {
                    id: whiteboardId,
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

  public async getCommunityForMemoOrFail(memoId: string): Promise<ICommunity> {
    const space = await this.entityManager.findOne(Space, {
      where: [
        {
          collaboration: {
            calloutsSet: {
              callouts: {
                contributions: {
                  memo: {
                    id: memoId,
                  },
                },
              },
            },
          },
        },
        {
          collaboration: {
            calloutsSet: {
              callouts: {
                framing: {
                  memo: {
                    id: memoId,
                  },
                },
              },
            },
          },
        },
      ],
      relations: {
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
    return community;
  }

  public async getCollaborationLicenseFromWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ILicense> {
    // check for whiteboard in contributions
    let collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
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
        license: {
          entitlements: true,
        },
      },
    });
    // check for whiteboard in framing
    if (!collaboration) {
      collaboration = await this.entityManager.findOne(Collaboration, {
        where: {
          calloutsSet: {
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
          license: {
            entitlements: true,
          },
        },
      });
    }
    if (!collaboration || !collaboration.license) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration with License for whiteboard: ${whiteboardId}`,
        LogContext.COLLABORATION
      );
    }

    return collaboration.license;
  }

  public async getCollaborationLicenseFromMemoOrFail(
    memoId: string
  ): Promise<ILicense> {
    // check for whiteboard in contributions
    let collaboration = await this.entityManager.findOne(Collaboration, {
      where: {
        calloutsSet: {
          callouts: {
            contributions: {
              memo: {
                id: memoId,
              },
            },
          },
        },
      },
      relations: {
        license: {
          entitlements: true,
        },
      },
    });
    // check for memo in framing
    if (!collaboration) {
      collaboration = await this.entityManager.findOne(Collaboration, {
        where: {
          calloutsSet: {
            callouts: {
              framing: {
                memo: {
                  id: memoId,
                },
              },
            },
          },
        },
        relations: {
          license: {
            entitlements: true,
          },
        },
      });
    }
    if (!collaboration || !collaboration.license) {
      throw new EntityNotFoundException(
        `Unable to find Collaboration with License for memo: ${memoId}`,
        LogContext.COLLABORATION
      );
    }

    return collaboration.license;
  }

  public async getCommunityFromCalendarEventOrFail(
    calendarEventId: string
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
        WHERE \`calendar_event\`.\`id\` = '${calendarEventId}';
      `
    );

    const community = await this.communityRepository.findOneBy({
      id: result.communityId,
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community: ${result.communityId} for CalendarEvent with id: ${calendarEventId}`,
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
        about: {
          profile: true,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for roleSet: ${roleSetID}`,
        LogContext.URL_GENERATOR
      );
    }
    return space;
  }

  public async getSpaceForCommunityOrFail(
    communityID: string
  ): Promise<ISpace> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityID,
        },
      },
      relations: {
        about: {
          profile: true,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find space for Community: ${communityID}`,
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
        about: {
          profile: true,
        },
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
    return space.about.profile.displayName;
  }

  public async getCommunityFromCollaborationCalloutRoomOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              comments: {
                id: commentsId,
              },
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
          calloutsSet: {
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
      },
      relations: {
        community: {
          roleSet: true,
        },
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
