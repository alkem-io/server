import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IUserSettingsCommunication } from './user.settings.communications.interface';

/**
 * The communication settings are stored in a JSONB column with no migration on
 * new fields (research Decision 3). Users created before
 * `allowOtherUsersToContactViaEmail` was introduced have no value for it in the
 * stored object, which would resolve to null against the non-null `Boolean!`
 * field. This resolver coerces a missing value to the documented default
 * (`false`), so every User reads a concrete boolean.
 */
@Resolver(() => IUserSettingsCommunication)
export class UserSettingsCommunicationResolverFields {
  @ResolveField('allowOtherUsersToContactViaEmail', () => Boolean, {
    nullable: false,
    description:
      'Allow other Users to be offered an email contact route to this User (using the account email; the address is never exposed). Default false.',
  })
  allowOtherUsersToContactViaEmail(
    @Parent() communication: IUserSettingsCommunication
  ): boolean {
    return communication.allowOtherUsersToContactViaEmail ?? false;
  }
}
