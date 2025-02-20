import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IInnovationFlow } from './innovation.flow.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';

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

  @Column('simple-array', { nullable: false })
  states!: string;

  @Column('json', { nullable: false })
  settings!: IInnovationFlowSettings;
}
