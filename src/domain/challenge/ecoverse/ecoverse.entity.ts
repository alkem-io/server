import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IEcoverse } from './ecoverse.interface';

@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity implements IEcoverse {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this Ecoverse',
  })
  @Column()
  textID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the Ecoverse',
  })
  @Column()
  name!: string;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @OneToMany(
    () => Organisation,
    host => host.hostedEcoverses,
    { eager: false, cascade: true }
  )
  @Field(() => Organisation, {
    nullable: true,
    description: 'The organisation that hosts this Ecoverse instance',
  })
  host?: Organisation;

  @OneToOne(
    () => Challenge,
    challenge => challenge.ecoverse,
    { eager: true, cascade: true }
  )
  @JoinColumn()
  challenge?: Challenge;

  // Create the ecoverse with enough defaults set/ members populated
  constructor() {
    super();
  }
}
