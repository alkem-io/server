import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';

@ObjectType('Room')
export abstract class IRoom extends IAuthorizable {
  // this should be RoomType instead of string but is breaking the world now :(
  type!: string;

  @Field(() => Number, {
    description: 'The number of messages in the Room.',
  })
  messagesCount!: number;

  externalRoomID!: string;

  displayName!: string;

  vcInteractions?: IVcInteraction[];
}
