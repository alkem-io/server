import { NVP } from '@domain/common/nvp/nvp.entity';
import { User } from '@domain/community/user/user.entity';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from '@domain/community/application/application.dto';
import { Community } from '../community';

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

  @Field(() => ApplicationStatus, { nullable: false })
  @Column()
  status!: ApplicationStatus;

  @Field(() => User)
  @ManyToOne(
    () => User,
    user => user.focalPoints,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  user!: User;

  @Field(() => [Question])
  @ManyToMany(
    () => NVP,
    nvp => nvp.id,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinTable({ name: 'application_questions' })
  questions?: Question[];

  @ManyToOne(
    () => Community,
    community => community.applications
  )
  community?: Community;
}
