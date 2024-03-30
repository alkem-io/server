import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community, ICommunity } from '@domain/community/community';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { SpaceType } from '@common/enums/space.type';
import { Space } from '@domain/challenge/space/space.entity';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity';

@Injectable()
export class CommunityResolverService {
  constructor(
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async getRootSpaceFromCommunityOrFail(community: ICommunity) {
    let baseChallenge: IBaseChallenge | null = null;
    switch (community.type) {
      case SpaceType.SPACE:
        baseChallenge = await this.entityManager.findOne(Space, {
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
        break;
      case SpaceType.CHALLENGE:
        baseChallenge = await this.entityManager.findOne(Challenge, {
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
        break;
      case SpaceType.OPPORTUNITY:
        baseChallenge = await this.entityManager.findOne(Opportunity, {
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
        break;
    }
    if (
      !baseChallenge ||
      !baseChallenge.account ||
      !baseChallenge.account.space
    ) {
      throw new EntityNotFoundException(
        `Unable to find Space for given community id: ${community.id}`,
        LogContext.COLLABORATION
      );
    }
    const space = baseChallenge.account.space;
    return space.id;
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
    const [result]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`space\`.\`id\` as \`spaceId\`, \`space\`.\`communityId\` as communityId, 'space' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`space\` on \`callout\`.\`collaborationId\` = \`space\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}' UNION

        SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`challenge\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}' UNION

        SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`opportunity\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}';
      `
    );

    const community = await this.communityRepository.findOneBy({
      id: result.communityId,
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community: ${result.communityId} for Callout: ${calloutId}`,
        LogContext.COMMUNITY
      );
    }
    return community;
  }

  public async getCommunityFromWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ICommunity> {
    const [result]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`space\`.\`id\` as \`spaceId\`, \`space\`.\`communityId\` as communityId, 'space' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`space\` on \`callout\`.\`collaborationId\` = \`space\`.\`collaborationId\`
        JOIN \`callout_contribution\` on \`callout_contribution\`.calloutId = \`callout\`.\`id\`
        JOIN \`whiteboard\` on \`callout_contribution\`.whiteboardId = \`whiteboard\`.\`id\`
        WHERE \`whiteboard\`.\`id\` = '${whiteboardId}' UNION

        SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`challenge\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
        JOIN \`callout_contribution\` on \`callout_contribution\`.calloutId = \`callout\`.\`id\`
        JOIN \`whiteboard\` on \`callout_contribution\`.whiteboardId = \`whiteboard\`.\`id\`
        WHERE \`whiteboard\`.\`id\` = '${whiteboardId}' UNION

        SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`opportunity\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
        JOIN \`callout_contribution\` on \`callout_contribution\`.calloutId = \`callout\`.\`id\`
        JOIN \`whiteboard\` on \`callout_contribution\`.whiteboardId = \`whiteboard\`.\`id\`
        WHERE \`whiteboard\`.\`id\` = '${whiteboardId}';
      `
    );

    if (!result) {
      const [result]: {
        entityId: string;
        communityId: string;
        communityType: string;
      }[] = await this.entityManager.connection.query(
        `
          SELECT \`space\`.\`id\` as \`spaceId\`, \`space\`.\`communityId\` as communityId, 'space' as \`entityType\` FROM \`callout\`
          RIGHT JOIN \`space\` on \`callout\`.\`collaborationId\` = \`space\`.\`collaborationId\`
          JOIN \`callout_framing\` on \`callout_framing\`.id = \`callout\`.\`framingId\`
          JOIN \`whiteboard\` on \`callout_framing\`.whiteboardId = \`whiteboard\`.\`id\`
          WHERE \`whiteboard\`.\`id\` = '${whiteboardId}' UNION

          SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`callout\`
          RIGHT JOIN \`challenge\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
          JOIN \`callout_framing\` on \`callout_framing\`.id = \`callout\`.\`framingId\`
          JOIN \`whiteboard\` on \`callout_framing\`.whiteboardId = \`whiteboard\`.\`id\`
          WHERE \`whiteboard\`.\`id\` = '${whiteboardId}' UNION

          SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`callout\`
          RIGHT JOIN \`opportunity\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
          JOIN \`callout_framing\` on \`callout_framing\`.id = \`callout\`.\`framingId\`
          JOIN \`whiteboard\` on \`callout_framing\`.whiteboardId = \`whiteboard\`.\`id\`
          WHERE \`whiteboard\`.\`id\` = '${whiteboardId}';
        `
      );

      const community = await this.communityRepository.findOneBy({
        id: result.communityId,
      });
      if (!community) {
        throw new EntityNotFoundException(
          `Unable to find Community: ${result.communityId} for Contribution: ${whiteboardId}`,
          LogContext.COMMUNITY
        );
      }
      return community;
    }

    const community = await this.communityRepository.findOneBy({
      id: result.communityId,
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community: ${result.communityId} for Contribution: ${whiteboardId}`,
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

  public async getCommunityFromCollaborationOrFail(
    collaborationID: string
  ): Promise<ICommunity> {
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

    const communityId = result.communityId;
    const community = await this.communityRepository.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for Collaboration: ${collaborationID}`,
        LogContext.NOTIFICATIONS
      );
    }
    return community;
  }

  public async getSpaceForCommunityOrFail(
    communityId: string,
    spaceType: SpaceType
  ): Promise<string> {
    const [result]: {
      profileId: string;
    }[] = await this.entityManager.connection.query(
      `SELECT profileId from \`${spaceType}\`
        WHERE \`${spaceType}\`.\`communityId\` = '${communityId}';`
    );

    const profileId = result.profileId;
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });
    if (!profile) {
      throw new EntityNotFoundException(
        `Unable to find Profile for Community: ${communityId}`,
        LogContext.NOTIFICATIONS
      );
    }
    return profile.displayName;
  }

  public async getBaseChallengeForCommunityOrFail(
    communityId: string,
    spaceType: SpaceType
  ): Promise<IBaseChallenge> {
    switch (spaceType) {
      case SpaceType.SPACE:
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
        if (space) {
          return space;
        }
        break;
      case SpaceType.CHALLENGE:
        const challenge = await this.entityManager.findOne(Challenge, {
          where: {
            community: {
              id: communityId,
            },
          },
          relations: {
            profile: true,
          },
        });
        if (challenge && challenge.profile) {
          return challenge;
        }
        break;
      case SpaceType.OPPORTUNITY:
        const opportunity = await this.entityManager.findOne(Opportunity, {
          where: {
            community: {
              id: communityId,
            },
          },
          relations: {
            profile: true,
          },
        });
        if (opportunity && opportunity.profile) {
          return opportunity;
        }
        break;
    }

    throw new EntityNotFoundException(
      `Unable to find base challenge for community of type '${spaceType}': ${communityId}`,
      LogContext.URL_GENERATOR
    );
  }

  public async getDisplayNameForCommunityOrFail(
    communityId: string,
    spaceType: SpaceType
  ): Promise<string> {
    const [result]: {
      profileId: string;
    }[] = await this.entityManager.connection.query(
      `SELECT profileId from \`${spaceType}\`
        WHERE \`${spaceType}\`.\`communityId\` = '${communityId}';`
    );

    const profileId = result.profileId;
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });
    if (!profile) {
      throw new EntityNotFoundException(
        `Unable to find Profile for Community: ${communityId}`,
        LogContext.NOTIFICATIONS
      );
    }
    return profile.displayName;
  }

  public async getCommunity(communityID: string) {
    return await this.communityRepository
      .createQueryBuilder('community')
      .where('community.id = :id')
      .setParameters({ id: communityID })
      .getOne();
  }

  public async getCommunityFromPostRoomOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    const [queryResult]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`communityType\` FROM \`callout\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
      JOIN \`post\` on \`callout_contribution\`.\`postId\` = \`post\`.\`id\`
      WHERE \`post\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`space\`.\`id\` as \`entityId\`, \`space\`.\`communityId\` as communityId, 'space' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`space\` on \`space\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
      JOIN \`post\` on \`callout_contribution\`.\`postId\` = \`post\`.\`id\`
      WHERE \`post\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`opportunity\`.\`id\` as \`entityId\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
      JOIN \`post\` on \`callout_contribution\`.\`postId\` = \`post\`.\`id\`
      WHERE \`post\`.\`commentsId\` = '${commentsId}';
      `
    );

    const community = await this.communityRepository.findOneBy({
      id: queryResult.communityId,
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for Comments: ${commentsId}`,
        LogContext.NOTIFICATIONS
      );
    }
    return community;
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
