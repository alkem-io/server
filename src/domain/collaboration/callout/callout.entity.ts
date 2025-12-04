import {
  Entity,
  OneToMany,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { ICallout } from './callout.interface';
import { Room } from '@domain/communication/room/room.entity';
import { CalloutFraming } from '../callout-framing/callout.framing.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { CalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.entity';
import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';
import { NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { CalloutsSet } from '../callouts-set/callouts.set.entity';
import { Classification } from '@domain/common/classification/classification.entity';
import { ICalloutSettings } from '../callout-settings/callout.settings.interface';

@Entity()
export class Callout extends AuthorizableEntity implements ICallout {
  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  @Column({ type: 'boolean', nullable: false, default: false })
  isTemplate!: boolean;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @OneToOne(() => CalloutFraming, framing => framing.callout, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  framing!: CalloutFraming;

  @Column('json', { nullable: false })
  settings!: ICalloutSettings;

  @OneToOne(() => Classification, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  classification!: Classification;

  @OneToOne(() => CalloutContributionDefaults, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  contributionDefaults?: CalloutContributionDefaults;

  @OneToMany(() => CalloutContribution, contribution => contribution.callout, {
    eager: false,
    cascade: true,
  })
  contributions?: CalloutContribution[];

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

  @ManyToOne(() => CalloutsSet, calloutsSet => calloutsSet.callouts, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  calloutsSet?: CalloutsSet;

  @Column('int', { nullable: false })
  sortOrder!: number;

  activity!: number;

  @Column('uuid', { nullable: true })
  publishedBy?: string;

  @Column('timestamp', { nullable: true })
  publishedDate?: Date;

  constructor() {
    super();
    this.framing = new CalloutFraming();
  }
}
