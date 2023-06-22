import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community, ICommunity } from '@domain/community/community';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Communication } from '@domain/communication/communication/communication.entity';

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
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`space\`.\`id\` as \`entityId\`, \`space\`.\`communityId\` as communityId, 'space' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`space\` on \`space\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`opportunity\`.\`id\` as \`entityId\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
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
