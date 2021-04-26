import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationMessageResult } from './communication.dto.message.result';

@ObjectType()
export class CommunicationRoomResult {
  @Field(() => [String], {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => [CommunicationMessageResult], {
    nullable: false,
    description: 'The message being sent',
  })
  messages!: CommunicationMessageResult[];
}
