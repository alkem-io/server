import { CalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { IKnowledgeBase } from './knowledge.base.interface';

@Entity()
export class KnowledgeBase
  extends AuthorizableEntity
  implements IKnowledgeBase
{
  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @OneToOne(() => CalloutsSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  calloutsSet?: CalloutsSet;

  @OneToOne(
    () => VirtualContributor,
    (vc: VirtualContributor) => vc.knowledgeBase
  )
  virtualContributor?: VirtualContributor;
}
