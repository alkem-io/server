import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsCommunication')
export abstract class IUserSettingsCommunication {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Allow Users to send messages to this User.',
  })
  allowOtherUsersToSendMessages!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow other Users to be offered an email contact route to this User (using the account email; the address is never exposed). Default false.',
  })
  allowOtherUsersToContactViaEmail!: boolean;
}
