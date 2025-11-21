import { Field, ObjectType } from '@nestjs/graphql';
import { IRoom } from '@domain/communication/room/room.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IConversationsSet } from '../conversations-set/conversations.set.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@ObjectType('Conversation')
export abstract class IConversation extends IAuthorizable {
  @Field(() => CommunicationConversationType, { nullable: false })
  type!: CommunicationConversationType;

  userID?: string;

  virtualContributorID?: string;

  @Field(() => VirtualContributorWellKnown, { nullable: true })
  wellKnownVirtualContributor?: VirtualContributorWellKnown;

  room?: IRoom;
  conversationsSet!: IConversationsSet;
}
