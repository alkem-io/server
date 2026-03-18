import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { NotificationInputOrganizationMention } from '@services/adapters/notification-adapter/dto/organization/notification.dto.input.organization.mention';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/user/notification.dto.input.entity.mentions';
import { NotificationInputUserMention } from '@services/adapters/notification-adapter/dto/user/notification.dto.input.user.mention';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMessage } from '../message/message.interface';
import { Mention, MentionedEntityType } from '../messaging/mention.interface';
import { IRoom } from '../room/room.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { VirtualContributorMessageService } from '../virtual.contributor.message/virtual.contributor.message.service';

@Injectable()
export class RoomMentionsService {
  MENTION_REGEX_ALL = new RegExp(
    `\\[@[^\\]]*]\\((http|https):\\/\\/[^)]*\\/(?<type>${MentionedEntityType.USER}|${MentionedEntityType.ORGANIZATION}|${MentionedEntityType.VIRTUAL_CONTRIBUTOR})\\/(?<nameid>[^)]+)\\)`,
    'gm'
  );

  constructor(
    private readonly notificationUserAdapter: NotificationUserAdapter,
    private readonly notificationOrganizationAdapter: NotificationOrganizationAdapter,
    private readonly communityResolverService: CommunityResolverService,
    private readonly roomLookupService: RoomLookupService,
    private readonly virtualContributorMessageService: VirtualContributorMessageService,
    private readonly virtualActorLookupService: VirtualActorLookupService,
    private readonly userLookupService: UserLookupService,
    private readonly organizationLookupService: OrganizationLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getSpaceIdForRoom(room: IRoom): Promise<string> {
    const community = await this.communityResolverService.getCommunityFromRoom(
      room.id,
      room.type
    );

    // The ID of the actual community where the vc is being invoked
    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      community.roleSet.id
    );
    return space.id;
  }

  async getVcInteractionByThread(
    roomID: string,
    threadID: string
  ): Promise<IVcInteraction | undefined> {
    const room = await this.roomLookupService.getRoomOrFail(roomID);

    const vcData = room.vcInteractionsByThread?.[threadID];
    if (!vcData) {
      return undefined;
    }

    return {
      threadID,
      virtualContributorID: vcData.virtualContributorActorID,
    };
  }

  public async processVirtualContributorMentions(
    mentions: Mention[],
    message: string,
    threadID: string,
    actorContext: ActorContext,
    room: IRoom
  ) {
    const contextSpaceID = await this.getSpaceIdForRoom(room);
    const vcMentions = mentions.filter(
      mention => mention.actorType === MentionedEntityType.VIRTUAL_CONTRIBUTOR
    );
    // Only the first VC mention starts an interaction
    // check if interaction was not already created instead of hardcoded
    let vcInteraction = await this.getVcInteractionByThread(room.id, threadID);

    for (const vcMention of vcMentions) {
      this.logger.verbose?.(
        `got mention for VC: ${vcMention.actorID}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
      if (!vcInteraction) {
        // Edge conversion: GraphQL mention (entity UUID) → agent.id for internal flow
        const virtualContributor =
          await this.virtualActorLookupService.getVirtualContributorByIdOrFail(
            vcMention.actorID
          );

        vcInteraction = await this.roomLookupService.addVcInteractionToRoom({
          virtualContributorActorID: virtualContributor.id,
          roomID: room.id,
          threadID: threadID,
        });
      }

      // Use agent.id (unified internal flow) instead of entity UUID
      await this.virtualContributorMessageService.invokeVirtualContributor(
        vcInteraction.virtualContributorID,
        message,
        threadID,
        actorContext,
        contextSpaceID,
        room
      );
    }
  }

  public async processNotificationMentions(
    mentions: Mention[],
    room: IRoom,
    message: IMessage,
    actorContext: ActorContext
  ) {
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: actorContext.actorID,
      roomId: room.id,
      mentions,
      messageID: message.id,
    };
    await this.entityMentions(entityMentionsNotificationInput);
  }

  public async entityMentions(
    eventData: NotificationInputEntityMentions
  ): Promise<void> {
    for (const mention of eventData.mentions) {
      if (mention.actorType == MentionedEntityType.USER) {
        const entityMentionNotificationInput: NotificationInputUserMention = {
          triggeredBy: eventData.triggeredBy,
          userID: mention.actorID,
          roomID: eventData.roomId,
          messageID: eventData.messageID,
        };
        await this.notificationUserAdapter.userMention(
          entityMentionNotificationInput
        );
      }
      if (mention.actorType === MentionedEntityType.ORGANIZATION) {
        const entityMentionNotificationInput: NotificationInputOrganizationMention =
          {
            triggeredBy: eventData.triggeredBy,
            organizationID: mention.actorID,
            roomID: eventData.roomId,
            messageID: eventData.messageID,
          };
        this.notificationOrganizationAdapter.organizationMention(
          entityMentionNotificationInput
        );
      }
    }
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
          actorID: user.id,
          actorType: MentionedEntityType.USER,
        });
      } else if (match.groups?.type === MentionedEntityType.ORGANIZATION) {
        const organization =
          await this.organizationLookupService.getOrganizationByNameIdOrFail(
            contributorNamedID
          );
        result.push({
          actorID: organization.id,
          actorType: MentionedEntityType.ORGANIZATION,
        });
      } else if (
        match.groups?.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR
      ) {
        const virtualContributor =
          await this.virtualActorLookupService.getVirtualContributorByNameIdOrFail(
            contributorNamedID
          );
        result.push({
          actorID: virtualContributor.id,
          actorType: MentionedEntityType.VIRTUAL_CONTRIBUTOR,
        });
      }
    }
    return result;
  }
}
