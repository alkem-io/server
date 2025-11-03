import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';
import { License } from '@domain/common/license/license.entity';
import { CalloutsSet } from '../callouts-set/callouts.set.entity';

@Entity()
export class Collaboration
  extends AuthorizableEntity
  implements ICollaboration
{
  @OneToOne(() => CalloutsSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  calloutsSet?: CalloutsSet;

  @Column({ type: 'boolean', nullable: false, default: false })
  isTemplate!: boolean;

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

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;
}
