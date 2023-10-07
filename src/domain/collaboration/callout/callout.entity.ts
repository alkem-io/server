import {
  Entity,
  OneToMany,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Post } from '@domain/collaboration/post/post.entity';
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

@Entity()
export class Callout extends AuthorizableEntity implements ICallout {
  @Column()
  nameID!: string;

  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column('char', { length: 36, nullable: true })
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

  @OneToMany(() => Whiteboard, whiteboard => whiteboard.callout, {
    eager: false,
    cascade: true,
  })
  whiteboards?: Whiteboard[];

  @OneToMany(() => CalloutContribution, contribution => contribution.callout, {
    eager: false,
    cascade: true,
  })
  contributions?: Whiteboard[];

  @OneToMany(() => Post, post => post.callout, {
    eager: false,
    cascade: true,
  })
  posts?: Post[];

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
