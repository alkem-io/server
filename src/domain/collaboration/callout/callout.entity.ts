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
import { User } from '@domain/community/user/user.entity';

@Entity()
export class Callout extends AuthorizableEntity implements ICallout {
  @Column()
  nameID!: string;

  @Column('text', { nullable: false })
  type!: CalloutType;

  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @Column('text', { nullable: false, default: CalloutVisibility.DRAFT })
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

  @Column('int', { default: 10 })
  sortOrder!: number;

  activity!: number;

  @Column('char', { length: 36, nullable: true })
  publishedBy!: string;

  @Column('datetime')
  publishedDate!: Date;

  constructor() {
    super();
    this.framing = new CalloutFraming();
  }
}
