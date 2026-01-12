import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { RoomType } from '@common/enums/room.type';
import { VcInteractionsByThread } from '../vc-interaction/vc.interaction.entity';

@ObjectType('Room')
export abstract class IRoom extends IAuthorizable {
  type!: RoomType;

  @Field(() => Number, {
    description: 'The number of messages in the Room.',
  })
  messagesCount!: number;

  displayName!: string;

  // Timestamp of the last message sent in the room
  lastMessageAt?: Date;

  // Internal storage (JSON column)
  vcInteractionsByThread!: VcInteractionsByThread;

  // GraphQL field (computed from JSON)
  vcInteractions?: IVcInteraction[];
}
