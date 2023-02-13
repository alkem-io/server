import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getConnection, Repository } from 'typeorm';
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
    private communicationRepository: Repository<Communication>
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
    }[] = await getConnection().query(
      `
        SELECT \`hub\`.\`id\` as \`hubId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`hub\` on \`callout\`.\`collaborationId\` = \`hub\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}' UNION

        SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`challenge\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}' UNION

        SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`opportunity\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}';
      `
    );

    const community = await this.communityRepository.findOne({
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
    }[] = await getConnection().query(
      `
        SELECT \`hub\`.\`id\` as \`hubId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`entityType\` FROM \`timeline\`
        RIGHT JOIN \`hub\` on \`timeline\`.\`id\` = \`hub\`.\`timelineID\`
        JOIN \`calendar\` on \`timeline\`.\`calendarId\` = \`calendar\`.\`id\`
        JOIN \`calendar_event\` on \`calendar\`.\`id\` = \`calendar_event\`.\`calendarId\`
        WHERE \`calendar_event\`.\`id\` = '${callendarEventId}';
      `
    );

    const community = await this.communityRepository.findOne({
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
    }[] = await getConnection().query(
      `
        SELECT communityId from \`hub\`
        WHERE \`hub\`.\`collaborationId\` = '${collaborationID}' UNION
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

  public async getCommunityFromCardCommentsOrFail(
    commentsId: string
  ): Promise<ICommunity> {
    const [queryResult]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await getConnection().query(
      `
      SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`communityType\` FROM \`callout\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`aspect\` on \`callout\`.\`id\` = \`aspect\`.\`calloutId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`hub\`.\`id\` as \`entityId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`hub\` on \`hub\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`aspect\` on \`callout\`.\`id\` = \`aspect\`.\`calloutId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`opportunity\`.\`id\` as \`entityId\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`aspect\` on \`callout\`.\`id\` = \`aspect\`.\`calloutId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}';
      `
    );

    const community = await this.communityRepository.findOne({
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
