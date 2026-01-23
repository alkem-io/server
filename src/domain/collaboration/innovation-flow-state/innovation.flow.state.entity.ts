import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { IInnovationFlowStateSettings } from '../innovation-flow-state-settings/innovation.flow.settings.interface';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';
import { Template } from '@domain/template/template/template.entity';

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

  @ManyToOne(() => Template, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'defaultCalloutTemplateId' })
  defaultCalloutTemplate?: Template | null;
}
