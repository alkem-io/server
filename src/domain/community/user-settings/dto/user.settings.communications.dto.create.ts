import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsCommunicationInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Allow Users to send messages to this User.',
  })
  @IsBoolean()
  allowOtherUsersToSendMessages!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow other Users to be offered an email contact route to this User. Default false.',
  })
  @IsBoolean()
  allowOtherUsersToContactViaEmail!: boolean;
}
