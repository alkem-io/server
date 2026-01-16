import { Column, Entity, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { IInnovationFlowStateSettings } from '../innovation-flow-state-settings/innovation.flow.settings.interface';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';

@Entity()
export class InnovationFlowState
  extends AuthorizableEntity
  implements IInnovationFlowState
{
  @Column('text', { nullable: false })
  displayName!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('jsonb', { nullable: false })
  settings!: IInnovationFlowStateSettings;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @ManyToOne(() => InnovationFlow, innovationFlow => innovationFlow.states, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  innovationFlow?: InnovationFlow;
}
