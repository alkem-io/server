import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('RoomInvitationReceived')
export class RoomInvitationReceived {
  @Field(() => String, {
    nullable: true,
    description: 'The roomId that the user has been added to',
  })
  roomId?: string;
}
