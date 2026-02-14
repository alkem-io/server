import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';

export abstract class NameableEntity extends AuthorizableEntity {
  nameID!: string;
  profile!: Profile;
}
