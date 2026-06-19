import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsCommunication')
export abstract class IUserSettingsCommunication {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Allow Users to send messages to this User.',
  })
  allowOtherUsersToSendMessages!: boolean;

  // Optional on the stored (JSONB) shape because users created before this
  // field existed have no value for it — no migration backfills it. The
  // GraphQL field stays non-null (`nullable: false`); the
  // UserSettingsCommunicationResolverFields resolver coerces a missing value
  // to the default (false).
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow other Users to be offered an email contact route to this User (using the account email; the address is never exposed). Default false.',
  })
  allowOtherUsersToContactViaEmail?: boolean;
}
