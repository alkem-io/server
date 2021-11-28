import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminRemoveOrphanedRoomInput {
  @Field(() => String, { nullable: false })
  roomID!: string;
}
