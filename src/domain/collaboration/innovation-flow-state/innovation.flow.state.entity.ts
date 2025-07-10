import { Column, Entity } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { IInnovationFlowStateSettings } from '../innovation-flow-state-settings/innovation.flow.settings.interface';
import { IInnovationFlowState } from './innovation.flow.state.interface';

@Entity()
export class InnovationFlowState
  extends AuthorizableEntity
  implements IInnovationFlowState
{
  @Column('text', { nullable: false })
  displayName!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column('json', { nullable: false })
  settings!: IInnovationFlowStateSettings;
}
