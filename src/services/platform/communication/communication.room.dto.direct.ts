import { Field, ObjectType } from '@nestjs/graphql';
import { CommunityRoom } from './communication.room.dto.community';

@ObjectType('DirectRoom')
export class DirectRoom extends CommunityRoom {
  @Field(() => String, {
    nullable: true,
    description: 'The recepient userID',
  })
  receiverID?: string;
}
