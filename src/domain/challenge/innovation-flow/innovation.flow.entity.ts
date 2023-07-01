import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IInnovationFlow } from './innovation.flow.interface';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set';

@Entity()
export class InnovationFlow
  extends AuthorizableEntity
  implements IInnovationFlow
{
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  profile!: Profile;

  @OneToOne(() => Lifecycle, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @Column()
  spaceID!: string;

  @Column('text', { nullable: false })
  type!: InnovationFlowType;

  @OneToOne(() => TagsetTemplateSet, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  tagsetTemplateSet?: TagsetTemplateSet;
}
