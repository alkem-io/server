import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ICommunityGuidelines } from './community.guidelines.interface';

export class CommunityGuidelines
  extends AuthorizableEntity
  implements ICommunityGuidelines
{
  profile!: Profile;
}
