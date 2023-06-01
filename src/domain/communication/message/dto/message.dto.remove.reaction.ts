import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveMessageReactionInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The Discussion with the message whose reaction is being removed',
  })
  communicationRoomID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Reaction that is being removed',
  })
  reactionID!: string;
}
