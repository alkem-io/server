import { Field, ObjectType } from '@nestjs/graphql';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IUserSettings } from '../user-settings/user.settings.interface';
import { IActor, IActorFull } from '@domain/actor/actor/actor.interface';
import { NameID } from '@domain/common/scalars';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('User', {
  implements: () => [IActorFull],
})
export class IUser extends IActor implements IActorFull {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  declare nameID: string;

  // Override to make profile required for contributors
  declare profile: IProfile;

  // User extends Actor - credentials are on Actor.credentials

  accountID!: string;
  rowId!: number;

  settings!: IUserSettings;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  storageAggregator?: IStorageAggregator;

  // Indicates if this profile is a service profile that is only used for service account style access
  // to the platform. Temporary measure, full service account support for later.
  serviceProfile!: boolean;

  // Protected via field access for gdpr reasons
  email!: string;
  phone?: string;

  // Internal Kratos identity binding
  authenticationID?: string | null;
}
