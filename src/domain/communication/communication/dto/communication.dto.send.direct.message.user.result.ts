import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';

@ObjectType('DirectRoom')
export class DirectRoomResult extends CommunicationRoomResult {
  @Field(() => String, {
    nullable: true,
    description: 'The recipient userID',
  })
  receiverID?: string;
}
