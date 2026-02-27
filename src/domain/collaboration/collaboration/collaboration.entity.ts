import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { License } from '@domain/common/license/license.entity';
import { Space } from '@domain/space/space/space.entity';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { CalloutsSet } from '../callouts-set/callouts.set.entity';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';

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

  @OneToOne(
    () => Space,
    space => space.collaboration
  )
  space?: Space;
}
