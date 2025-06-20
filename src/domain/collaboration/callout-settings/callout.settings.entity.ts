import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ENUM_LENGTH } from '@common/constants';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ICalloutSettings } from './callout.settings.interface';
import { CalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.entity';

@Entity()
export class CalloutSettings
  extends AuthorizableEntity
  implements ICalloutSettings
{
  @OneToOne(() => CalloutSettingsContribution, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  contribution!: CalloutSettingsContribution;

  /*@Column('json', { nullable: false })
  contribution!: {
    enabled: boolean;
    allowedTypes: CalloutContributionType[];
    canAddContributions: CalloutContributionAddType;
    commentsEnabled: boolean;
  };

  @Column('json', { nullable: false })
  framing!: {
    type: CalloutFramingType;
    commentsEnabled: boolean;
  };
*/
  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  visibility!: CalloutVisibility;
}
