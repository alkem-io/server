import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { MessageID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';

@ObjectType('Message', {
  description: 'A message that was sent in a chat room',
})
export class IMessage {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The id for the message event.',
  })
  id!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;

  // Actor ID of the sender - resolved to Contributor by field resolver
  sender!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;

  @Field(() => [IMessageReaction], {
    nullable: false,
    description: 'Reactions on this message',
  })
  reactions!: IMessageReaction[];

  @Field(() => MessageID, {
    nullable: true,
    description: 'The message being replied to',
  })
  threadID?: string;

  // --- feature 013: conversation media attachments (non-GraphQL carriers) ---
  // Raw attachment refs surfaced by matrix-adapter: `document_id` (outbound echo
  // of our own media) and/or `media_id` (Element-origin, the inbound re-home /
  // by-reference key). Resolved to `MessageAttachment` by `@ResolveField`.
  rawAttachments?: ReceivedAttachment[];

  // The storage bucket the attachments resolve against (the conversation bucket,
  // or the parent callout/post bucket for comment rooms). Set by message
  // producers that have room context; required for inbound by-reference lookup
  // and for READ-gating the resolved documents.
  storageBucketId?: string;

  // The Alkemio room id this message belongs to. Carried so the attachments
  // resolver can resolve the storage bucket from the room on history read paths
  // (getMessage/getMessages/getLastMessages), where storageBucketId is not set
  // by the producer (feature 013, H1).
  roomID?: string;
}
