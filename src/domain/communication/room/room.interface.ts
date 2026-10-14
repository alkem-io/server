import { RoomType } from '@common/enums/room.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { UUID } from '@domain/common/scalars';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { VcInteractionsByThread } from '../vc-interaction/vc.interaction.entity';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';

@ObjectType('Room')
export abstract class IRoom extends IAuthorizable {
  @Field(() => RoomType, {
    description:
      'The type of room (e.g., post, callout, conversation_direct, conversation_group).',
  })
  type!: RoomType;

  @Field(() => Int, {
    description: 'The number of messages in the Room.',
  })
  messagesCount!: number;

  @Field(() => String, {
    description: 'The display name of the Room.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The avatar URL of the Room (mxc:// or https://). Fetched from Matrix.',
  })
  avatarUrl?: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The owning bucket for reference-based attachments.',
  })
  attachmentBucketId?: string;

  // Internal storage (JSON column)
  vcInteractionsByThread!: VcInteractionsByThread;

  // GraphQL field (computed from JSON)
  vcInteractions?: IVcInteraction[];
}
