import { MID_TEXT_LENGTH } from '@constants';
import { Challenge } from '@domain/challenge/challenge.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { NVP } from '@domain/nvp/nvp.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { User } from '@domain/user/user.entity';
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

  @Field(() => String, { nullable: true })
  @Column({ length: MID_TEXT_LENGTH, nullable: true })
  reason?: string;

  @Field(() => User)
  @ManyToOne(
    () => User,
    user => user.focalPoints,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  user!: User;

  @Field(() => [NVP])
  @ManyToMany(
    () => NVP,
    nvp => nvp.id,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinTable({ name: 'application_questions' })
  questions?: NVP[];

  @ManyToMany(
    () => Ecoverse,
    ecoverse => ecoverse.applications
  )
  ecoverse?: Ecoverse;

  @ManyToMany(
    () => Challenge,
    ecoverse => ecoverse.applications
  )
  challenge?: Challenge;

  @ManyToMany(
    () => Opportunity,
    ecoverse => ecoverse.applications
  )
  opportunity?: Opportunity;
}
