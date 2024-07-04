import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminUpdateRoomStateInput {
  @Field(() => Boolean, { nullable: false })
  isPublic!: boolean;

  @Field(() => Boolean, { nullable: false })
  isWorldVisible!: boolean;

  @Field(() => String, { nullable: false })
  roomID!: string;
}
