import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('DirectRoom')
export class DirectRoomResult extends CommunicationRoomResult {
  @Field(() => String, {
    nullable: true,
    description: 'The recipient userID',
  })
  receiverID?: string;
}
