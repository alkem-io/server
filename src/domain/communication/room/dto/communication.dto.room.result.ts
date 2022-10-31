import { IMessage } from '@domain/communication/message/message.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationRoom')
export class CommunicationRoomResult {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => [IMessage], {
    nullable: false,
    description: 'The messages that have been sent to the Room.',
  })
  messages!: IMessage[];

  @Field(() => String, {
    nullable: false,
    description: 'The display name of the room',
  })
  displayName!: string;

  // The communication IDs of the room members
  members!: string[];

  constructor() {
    this.displayName = '';
  }
}
