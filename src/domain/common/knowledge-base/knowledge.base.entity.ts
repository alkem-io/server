import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { CalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.entity';
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
}
