import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationMessageResult } from './communication.dto.message.result';

@ObjectType('CommunityRoom')
export class CommunityRoom {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => [CommunicationMessageResult], {
    nullable: false,
    description: 'The messages that have been sent to the Room.',
  })
  messages!: CommunicationMessageResult[];
}
