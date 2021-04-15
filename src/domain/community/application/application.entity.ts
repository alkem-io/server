import { NVP } from '@domain/common/nvp/nvp.entity';
import { User } from '@domain/community/user/user.entity';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
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
import { Question } from '@domain/community/application';
import { Community } from '../community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';

export enum ApplicationStatus {
  new,
  approved,
  rejected,
}

registerEnumType(ApplicationStatus, {
  name: 'ApplicationStatus',
});

@Entity()
@ObjectType()
export class Application extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => ApplicationStatus, { nullable: false })
  @Column()
  status!: ApplicationStatus;

  @Field(() => Lifecycle, { nullable: false })
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

  @Field(() => [Question])
  @ManyToMany(
    () => NVP,
    nvp => nvp.id,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'application_questions' })
  questions?: Question[];

  @ManyToOne(
    () => Community,
    community => community.applications,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  community?: Community;
}
