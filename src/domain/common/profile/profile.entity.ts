import { ProfileType } from '@common/enums';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Location } from '@domain/common/location/location.entity';
import { Reference } from '@domain/common/reference/reference.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { IProfile } from './profile.interface';

export class Profile extends AuthorizableEntity implements IProfile {
  references?: Reference[];

  tagsets?: Tagset[];

  visuals?: Visual[];

  displayName!: string;

  tagline?: string;

  description?: string;

  type!: ProfileType;

  location?: Location;

  storageBucket?: StorageBucket;

  // Constructor
  constructor() {
    super();
  }
}
