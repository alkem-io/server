import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { InnovationFlowState } from '../innovation-flow-state/innovation.flow.state.entity';
import { IInnovationFlow } from './innovation.flow.interface';

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

  @OneToMany(
    () => InnovationFlowState,
    state => state.innovationFlow,
    {
      eager: false,
      cascade: true,
    }
  )
  states!: InnovationFlowState[];

  @Column('uuid', { nullable: true })
  currentStateID?: string;

  @Column('jsonb', { nullable: false })
  settings!: IInnovationFlowSettings;

  @OneToOne(() => TagsetTemplate, {
    eager: false,
    cascade: false, // the tagset template is managed by the tagsetTemplateSet on CalloutSet
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  flowStatesTagsetTemplate!: TagsetTemplate;
}
