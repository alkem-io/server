import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';
import { License } from '@domain/common/license/license.entity';

@Entity()
export class Collaboration
  extends AuthorizableEntity
  implements ICollaboration
{
  @OneToMany(() => Callout, callout => callout.collaboration, {
    eager: false,
    cascade: true,
  })
  callouts?: Callout[];

  @OneToOne(() => TagsetTemplateSet, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  tagsetTemplateSet?: TagsetTemplateSet;

  @OneToOne(() => Timeline, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  timeline?: Timeline;

  @OneToOne(() => InnovationFlow, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  innovationFlow?: InnovationFlow;

  @Column('text', { nullable: false })
  groupsStr!: string;

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;
}
