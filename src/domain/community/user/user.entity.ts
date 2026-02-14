import { Application } from '@domain/access/application/application.entity';
import { IUser } from '@domain/community/user/user.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { UserSettings } from '../user-settings/user.settings.entity';

export class User extends ContributorBase implements IUser {
  accountID!: string;

  rowId!: number;

  firstName!: string;

  lastName!: string;

  email!: string;

  phone?: string;

  authenticationID!: string | null;

  serviceProfile!: boolean;

  applications?: Application[];

  settings!: UserSettings;

  storageAggregator?: StorageAggregator;
}
