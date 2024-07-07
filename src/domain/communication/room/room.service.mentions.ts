import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IMessage } from '../message/message.interface';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { RoomType } from '@common/enums/room.type';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { getMentionsFromText } from '../messaging/get.mentions.from.text';
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
import { NotSupportedException } from '@common/exceptions';
import { VirtualContributorQuestionInput } from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.question.input';
import { MessageService } from '../message/message.service';

@Injectable()
export class RoomServiceEvents {
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

  public async processVirtualContributorMentions(
    mentions: Mention[],
    question: Pick<IMessage, 'id' | 'message'>,
    agentInfo: AgentInfo,
    room: IRoom,
    accessToVirtualContributors: boolean
  ) {
    const community = await this.communityResolverService.getCommunityFromRoom(
      room.id,
      room.type as RoomType
    );

    const spaceID =
      await this.communityResolverService.getRootSpaceIDFromCommunityOrFail(
        community
      );

    for (const mention of mentions) {
      if (mention.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR) {
        // Only throw exception here for the case that there is an actual mention
        if (!accessToVirtualContributors) {
          throw new NotSupportedException(
            `Access to Virtual Contributors is not supported for this room: ${room.id}`,
            LogContext.COMMUNICATION
          );
        }

        this.logger.warn(
          `got mention for VC: ${mention.nameId}`,
          LogContext.COMMUNICATION
        );

        const virtualContributor =
          await this.virtualContributorService.getVirtualContributor(
            mention.nameId,
            {
              relations: {
                aiPersona: true,
              },
            }
          );

        const virtualPersona = virtualContributor?.aiPersona;

        if (!virtualPersona) {
          throw new Error(
            `VirtualPersona not loaded for VirtualContributor ${virtualContributor?.nameID}`
          );
        }

        const chatData: VirtualContributorQuestionInput = {
          virtualContributorID: virtualContributor.id,
          question: question.message,
        };

        const result = await this.virtualContributorService.askQuestion(
          chatData,
          agentInfo,
          spaceID
        );

        const simpleAnswer =
          this.messageService.convertAnswerToSimpleMessage(result);

        const answerData: RoomSendMessageReplyInput = {
          message: simpleAnswer,
          roomID: room.id,
          threadID: question.id,
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
    }
  }

  public processNotificationMentions(
    parentEntityId: string,
    parentEntityNameId: string,
    parentEntityProfile: IProfile,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ): Mention[] {
    const mentions = getMentionsFromText(message.message);
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
    return mentions;
  }
}
