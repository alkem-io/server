import { NVP } from '@domain/common/nvp/nvp.entity';
import { User } from '@domain/community/user/user.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IQuestion } from '@domain/community/application';
import { Community } from '../community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IApplication } from './application.interface';
import { ILifecycle } from '@domain/common/lifecycle';

@Entity()
@ObjectType()
export class Application extends BaseEntity implements IApplication {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Column()
  ecoverseID?: string;

  @Field(() => ILifecycle, { nullable: false })
  @OneToOne(() => Lifecycle, { eager: true, cascade: true })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @Field(() => User)
  @ManyToOne(
    () => User,
    user => user.applications,
    { eager: true, cascade: true }
  )
  user!: User;

  @Field(() => [IQuestion])
  @ManyToMany(
    () => NVP,
    nvp => nvp.id,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'application_questions' })
  questions?: IQuestion[];

  @ManyToOne(
    () => Community,
    community => community.applications,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  community?: Community;
}
