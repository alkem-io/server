import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { ISpaceAbout } from './space.about.interface';

export class SpaceAbout extends AuthorizableEntity implements ISpaceAbout {
  why?: string = '';

  who?: string = '';

  profile!: Profile;

  guidelines?: CommunityGuidelines;
}
