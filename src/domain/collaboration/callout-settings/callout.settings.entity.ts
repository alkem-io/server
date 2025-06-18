import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ENUM_LENGTH } from '@common/constants';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ICalloutSettings } from './callout.settings.interface';

@Entity()
export class CalloutSettings
  extends AuthorizableEntity
  implements ICalloutSettings
{
  /*@Column('json', { nullable: false })
  contribution!: {
    enabled: boolean;
    allowedTypes: CalloutContributionType[];
    canAddContributions: CalloutContributionAddType;
    commentsEnabled: boolean;
  };

  @OneToOne(() => CalloutContributionPolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  contributionPolicy!: CalloutContributionPolicy;

  @Column('json', { nullable: false })
  framing!: {
    type: CalloutFramingType;
    commentsEnabled: boolean;
  };
*/
  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  visibility!: CalloutVisibility;
}
