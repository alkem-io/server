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
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Room } from '@domain/communication/room/room.entity';
import { CalloutFraming } from '../callout-framing/callout.framing.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { CalloutContributionPolicy } from '../callout-contribution-policy/callout.contribution.policy.entity';
import { CalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.entity';
import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';
import {
  ENUM_LENGTH,
  NAMEID_MAX_LENGTH_SCHEMA,
  UUID_LENGTH,
} from '@common/constants';

@Entity()
export class Callout extends AuthorizableEntity implements ICallout {
  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column({ type: 'boolean', nullable: false })
  isTemplate!: boolean;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  visibility!: CalloutVisibility;

  @OneToOne(() => CalloutFraming, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  framing!: CalloutFraming;

  @OneToOne(() => CalloutContributionPolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  contributionPolicy!: CalloutContributionPolicy;

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

  @ManyToOne(() => Collaboration, collaboration => collaboration.callouts, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  collaboration?: Collaboration;

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
  }
}
