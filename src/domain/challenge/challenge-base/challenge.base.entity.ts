/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Tagset } from '@domain/common/tagset';
import { IChallengeBase } from '@domain/challenge';
import { Lifecycle } from '@domain/common/lifecycle';
import { Community } from '@domain/community/community';
import { Context } from '@domain/context/context';

export abstract class ChallengeBase extends BaseEntity
  implements IChallengeBase {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Column()
  ecverseID!: string;

  @Column()
  name: string;

  @Column()
  textID: string;

  @OneToOne(() => Context, { eager: false, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  context?: Context;

  @OneToOne(
    () => Community,
    community => community.challenge,
    { eager: false, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  @OneToOne(() => Lifecycle, { eager: false, cascade: true })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.textID = textID;
  }
}
