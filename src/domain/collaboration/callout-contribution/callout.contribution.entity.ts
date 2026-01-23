import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Post } from '../post/post.entity';
import { Callout } from '../callout/callout.entity';
import { Link } from '../link/link.entity';
import { ENUM_LENGTH } from '@common/constants';
import { Memo } from '@domain/common/memo/memo.entity';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@Entity()
export class CalloutContribution
  extends AuthorizableEntity
  implements ICalloutContribution
{
  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutContributionType.POST,
  })
  type!: CalloutContributionType;

  @OneToOne(() => Whiteboard, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  whiteboard?: Whiteboard;

  @OneToOne(() => Memo, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  memo?: Memo;

  @OneToOne(() => Post, post => post.contribution, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  post?: Post;

  @OneToOne(() => Link, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  link?: Link;

  @ManyToOne(() => Callout, callout => callout.contributions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @Column('int')
  sortOrder!: number;
}
