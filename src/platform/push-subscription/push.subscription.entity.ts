import { User } from '@domain/community/user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('push_subscription')
@Unique(['endpoint'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', {
    nullable: false,
    comment: 'The user who owns this push subscription.',
  })
  userID!: string;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userID' })
  user?: User;

  @Column('text', {
    nullable: false,
    comment: 'The push service endpoint URL.',
  })
  endpoint!: string;

  @Column('varchar', {
    length: 255,
    nullable: false,
    comment: 'The p256dh key for payload encryption.',
  })
  p256dh!: string;

  @Column('varchar', {
    length: 255,
    nullable: false,
    comment: 'The auth secret for payload encryption.',
  })
  auth!: string;

  @CreateDateColumn()
  createdDate!: Date;
}
