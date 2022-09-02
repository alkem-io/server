import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SendMessageOnCalloutInput {
  @Field(() => String, { nullable: false })
  message!: string;
}
