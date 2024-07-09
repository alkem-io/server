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
import { MutationType } from '@common/enums/subscriptions/mutation.type';
import { RoomSendMessageReplyInput } from '@domain/communication/room/dto/room.dto.send.message.reply';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service/subscription.publish.service';
import { RoomService } from './room.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { VirtualContributorQuestionInput } from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.question.input';
import { MessageService } from '../message/message.service';

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
    private messageService: MessageService,
    private subscriptionPublishService: SubscriptionPublishService,
    private virtualContributorService: VirtualContributorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getSpaceIdForRoom(room: IRoom): Promise<string> {
    const community = await this.communityResolverService.getCommunityFromRoom(
      room.id,
      room.type as RoomType
    );

    // The ID of the actual community where the question is being asked
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );
    return space.id;
  }

  public async processVirtualContributorMentions(
    mentions: Mention[],
    question: string,
    threadID: string,
    agentInfo: AgentInfo,
    room: IRoom
  ) {
    const contextSpaceID = await this.getSpaceIdForRoom(room);
    const vcMentions = mentions.filter(
      mention => mention.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR
    );
    // Only the first VC mention starts an interaction
    let firstVcMentionFound = false;
    for (const vcMention of vcMentions) {
      this.logger.verbose?.(
        `got mention for VC: ${vcMention.nameId}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
      await this.askQuestionToVirtualContributor(
        vcMention.nameId,
        question,
        threadID,
        agentInfo,
        contextSpaceID,
        room
      );
      if (!firstVcMentionFound) {
        await this.roomService.addInteractionToRoom({
          virtualContributorID: vcMention.nameId,
          roomID: room.id,
          threadID: threadID,
        });
        firstVcMentionFound = true;
      }
    }
  }

  public async askQuestionToVirtualContributor(
    nameID: string,
    question: string,
    threadID: string,
    agentInfo: AgentInfo,
    contextSpaceID: string,
    room: IRoom
  ) {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributor(nameID, {
        relations: {
          aiPersona: true,
        },
      });

    const virtualPersona = virtualContributor?.aiPersona;

    if (!virtualPersona) {
      throw new EntityNotInitializedException(
        `VirtualPersona not loaded for VirtualContributor ${virtualContributor?.nameID}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }

    const chatData: VirtualContributorQuestionInput = {
      virtualContributorID: virtualContributor.id,
      question: question,
    };

    const result = await this.virtualContributorService.askQuestion(
      chatData,
      agentInfo,
      contextSpaceID
    );

    const simpleAnswer =
      this.messageService.convertAnswerToSimpleMessage(result);

    const answerData: RoomSendMessageReplyInput = {
      message: simpleAnswer,
      roomID: room.id,
      threadID: threadID,
    };
    const answerMessage = await this.roomService.sendMessageReply(
      room,
      virtualContributor.communicationID,
      answerData,
      'virtualContributor'
    );

    this.subscriptionPublishService.publishRoomEvent(
      room.id,
      MutationType.CREATE,
      answerMessage
    );
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

  public getMentionsFromText(text: string): Mention[] {
    const result: Mention[] = [];
    for (const match of text.matchAll(this.MENTION_REGEX_ALL)) {
      if (match.groups?.type === MentionedEntityType.USER) {
        result.push({
          nameId: match.groups.nameid,
          type: MentionedEntityType.USER,
        });
      } else if (match.groups?.type === MentionedEntityType.ORGANIZATION) {
        result.push({
          nameId: match.groups.nameid,
          type: MentionedEntityType.ORGANIZATION,
        });
      } else if (
        match.groups?.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR
      ) {
        result.push({
          nameId: match.groups.nameid,
          type: MentionedEntityType.VIRTUAL_CONTRIBUTOR,
        });
      }
    }
    return result;
  }
}
