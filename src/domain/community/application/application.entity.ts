import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
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

  @ManyToMany(
    () => Ecoverse,
    ecoverse => ecoverse.applications
  )
  ecoverse?: Ecoverse[];

  @ManyToMany(
    () => Challenge,
    challenge => challenge.applications
  )
  challenge?: Challenge[];

  @ManyToMany(
    () => Opportunity,
    opportunity => opportunity.applications
  )
  opportunity?: Opportunity[];
}
