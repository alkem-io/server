import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoomDetails {
  @Field(() => String, {
    nullable: false,
    description: 'The room to which the reply should be posted.',
  })
  roomID!: string;
  @Field(() => String, {
    nullable: true,
    description: 'The thread to which the reply should be posted.',
  })
  threadID?: string;
  @Field(() => String, {
    nullable: false,
    description: 'The communicationID for the VC',
  })
  communicationID!: string;
  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question',
  })
  vcInteractionID?: string | undefined = undefined;
}
