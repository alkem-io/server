import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { IReference } from './reference.interface';

export class Reference extends AuthorizableEntity implements IReference {
  name: string;

  uri: string;

  description?: string;

  profile?: Profile;

  constructor(name: string, uri: string, description?: string) {
    super();
    this.name = name;
    this.uri = uri || '';
    this.description = '';
    if (description) {
      this.description = description;
    }
  }
}
