import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ILink } from './link.interface';

export class Link extends AuthorizableEntity implements ILink {
  profile!: Profile;

  uri = '';
}
