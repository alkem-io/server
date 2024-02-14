import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Post } from '../post';
import { Callout } from '../callout/callout.entity';
import { Link } from '../link/link.entity';
import { User } from '@domain/community/user/user.entity';

@Entity()
export class CalloutContribution
  extends AuthorizableEntity
  implements ICalloutContribution
{
  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @OneToOne(() => Whiteboard, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  whiteboard?: Whiteboard;

  @OneToOne(() => Post, {
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
}
