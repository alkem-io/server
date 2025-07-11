import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IInnovationFlow } from './innovation.flow.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { InnovationFlowState } from '../innovation-flow-state/innovation.flow.state.entity';

@Entity()
export class InnovationFlow
  extends AuthorizableEntity
  implements IInnovationFlow
{
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @OneToMany(() => InnovationFlowState, state => state.innovationFlow, {
    eager: false,
    cascade: true,
  })
  states!: InnovationFlowState[];

  @Column('json', { nullable: false })
  currentState!: IInnovationFlowState;

  @Column('json', { nullable: false })
  settings!: IInnovationFlowSettings;

  @OneToOne(() => TagsetTemplate, {
    eager: false,
    cascade: false, // the tagset template is managed by the tagsetTemplateSet on CalloutSet
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  flowStatesTagsetTemplate!: TagsetTemplate;
}
