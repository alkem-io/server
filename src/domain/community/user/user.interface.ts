import { Field, ObjectType } from '@nestjs/graphql';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IContributor } from '../contributor/contributor.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IUserSettings } from '../user-settings/user.settings.interface';

@ObjectType('User', {
  implements: () => [IContributor],
})
export class IUser extends IContributorBase implements IContributor {
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
