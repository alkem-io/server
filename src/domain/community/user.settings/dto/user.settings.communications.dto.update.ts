import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserSettingsCommunicationInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Allow Users to send messages to this User.',
  })
  allowOtherUsersToSendMessages!: boolean;
}
