import { CalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IKnowledgeBase } from './knowledge.base.interface';

export class KnowledgeBase
  extends AuthorizableEntity
  implements IKnowledgeBase
{
  profile!: Profile;

  calloutsSet?: CalloutsSet;

  virtualContributor?: VirtualContributor;
}
