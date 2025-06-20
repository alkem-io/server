import {
  Entity,
  OneToMany,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { ICallout } from './callout.interface';
import { CalloutType } from '@common/enums/callout.type';
import { Room } from '@domain/communication/room/room.entity';
import { CalloutFraming } from '../callout-framing/callout.framing.entity';
import { CalloutSettings } from '../callout-settings/callout.settings.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { CalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.entity';
import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';
import { NAMEID_MAX_LENGTH_SCHEMA, UUID_LENGTH } from '@common/constants';
import { CalloutsSet } from '../callouts-set/callouts.set.entity';
import { Classification } from '@domain/common/classification/classification.entity';

@Entity()
export class Callout extends AuthorizableEntity implements ICallout {
  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  /**
   * @deprecated remove //!!
   */
  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column({ type: 'boolean', nullable: false, default: false })
  isTemplate!: boolean;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @OneToOne(() => CalloutFraming, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  framing!: CalloutFraming;

  @OneToOne(() => CalloutSettings, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  settings!: CalloutSettings;

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

  @Column('char', { length: UUID_LENGTH, nullable: true })
  publishedBy?: string;

  @Column('datetime', { nullable: true })
  publishedDate?: Date;

  constructor() {
    super();
    this.framing = new CalloutFraming();
    this.settings = new CalloutSettings();
  }
}
