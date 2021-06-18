import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationMessageResult } from './communication.dto.message.result';

@ObjectType()
export class CommunicationRoomResult {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Indicates whether this is a DM room',
  })
  isDirect!: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'The recepient userID',
  })
  receiverID?: string;
}

@ObjectType()
export class CommunicationRoomDetailsResult extends CommunicationRoomResult {
  @Field(() => [CommunicationMessageResult], {
    nullable: false,
    description: 'The message being sent',
  })
  messages!: CommunicationMessageResult[];
}
