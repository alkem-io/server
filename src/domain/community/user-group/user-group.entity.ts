import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Community } from '@domain/community/community/community.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';

export class UserGroup extends AuthorizableEntity implements IUserGroup {
  profile?: Profile;

  organization?: Organization;

  community?: Community;

  constructor() {
    super();
  }
}
