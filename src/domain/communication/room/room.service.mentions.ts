import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IMessage } from '../message/message.interface';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { RoomType } from '@common/enums/room.type';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { IRoom } from './room.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IProfile } from '@domain/common/profile';
import { Mention, MentionedEntityType } from '../messaging/mention.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { RoomService } from './room.service';
import { EntityNotFoundException } from '@common/exceptions';
import { VirtualContributorMessageService } from '../virtual.contributor.message/virtual.contributor.message.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';

@Injectable()
export class RoomServiceMentions {
  MENTION_REGEX_ALL = new RegExp(
    `\\[@[^\\]]*]\\((http|https):\\/\\/[^)]*\\/(?<type>${MentionedEntityType.USER}|${MentionedEntityType.ORGANIZATION}|${MentionedEntityType.VIRTUAL_CONTRIBUTOR})\\/(?<nameid>[^)]+)\\)`,
    'gm'
  );

  constructor(
    private notificationAdapter: NotificationAdapter,
    private communityResolverService: CommunityResolverService,
    private roomService: RoomService,
    private virtualContributorMessageService: VirtualContributorMessageService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getSpaceIdForRoom(room: IRoom): Promise<string> {
    const community = await this.communityResolverService.getCommunityFromRoom(
      room.id,
      room.type as RoomType
    );

    // The ID of the actual community where the vc is being invoced
    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      community.roleSet.id
    );
    return space.id;
  }

  public async processVirtualContributorMentions(
    mentions: Mention[],
    message: string,
    threadID: string,
    agentInfo: AgentInfo,
    room: IRoom
  ) {
    const contextSpaceID = await this.getSpaceIdForRoom(room);
    const vcMentions = mentions.filter(
      mention => mention.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR
    );
    // Only the first VC mention starts an interaction
    // check if interaction was not already created instead of hardcoded
    let vcInteraction = await this.roomService.getVcInteractionByThread(
      room.id,
      threadID
    );

    for (const vcMention of vcMentions) {
      this.logger.verbose?.(
        `got mention for VC: ${vcMention.id}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
      if (!vcInteraction) {
        vcInteraction = await this.roomService.addVcInteractionToRoom({
          virtualContributorID: vcMention.id,
          roomID: room.id,
          threadID: threadID,
        });
      }

      await this.virtualContributorMessageService.invokeVirtualContributor(
        vcMention.id,
        message,
        threadID,
        agentInfo,
        contextSpaceID,
        room,
        vcInteraction
      );
    }
  }

  public processNotificationMentions(
    mentions: Mention[],
    parentEntityId: string,
    parentEntityNameId: string,
    parentEntityProfile: IProfile,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: message.message,
      roomId: room.id,
      mentions,
      originEntity: {
        id: parentEntityId,
        nameId: parentEntityNameId,
        displayName: parentEntityProfile.displayName,
      },
      commentType: room.type as RoomType,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
  }

  public async getMentionsFromText(text: string): Promise<Mention[]> {
    const result: Mention[] = [];
    for (const match of text.matchAll(this.MENTION_REGEX_ALL)) {
      const contributorNamedID = match.groups?.nameid;
      if (!contributorNamedID) {
        throw new EntityNotFoundException(
          `No nameID found in mention: ${match}`,
          LogContext.COMMUNICATION
        );
      }
      if (match.groups?.type === MentionedEntityType.USER) {
        const user =
          await this.userLookupService.getUserByNameIdOrFail(
            contributorNamedID
          );
        result.push({
          id: user.id,
          type: MentionedEntityType.USER,
        });
      } else if (match.groups?.type === MentionedEntityType.ORGANIZATION) {
        const organization =
          await this.organizationLookupService.getOrganizationByNameIdOrFail(
            contributorNamedID
          );
        result.push({
          id: organization.id,
          type: MentionedEntityType.ORGANIZATION,
        });
      } else if (
        match.groups?.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR
      ) {
        const virtualContributor =
          await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
            contributorNamedID
          );
        result.push({
          id: virtualContributor.id,
          type: MentionedEntityType.VIRTUAL_CONTRIBUTOR,
        });
      }
    }
    return result;
  }
}
