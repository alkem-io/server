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
import { Context } from '@domain/context/context/context.entity';
import { DID } from '@domain/agent/did/did.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { IEcoverse } from './ecoverse.interface';
import { Community } from '@domain/community/community';
import { ICommunityable } from '@interfaces/communityable.interface';

@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity implements IEcoverse, ICommunityable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  // The context and host organisation
  @Field(() => String, { nullable: false, description: '' })
  @Column()
  name: string;

  @Field(() => Organisation, {
    nullable: true,
    description: 'The organisation that hosts this Ecoverse instance',
  })
  @OneToOne(() => Organisation, { eager: true, cascade: true })
  @JoinColumn()
  host?: Organisation;

  @Field(() => Context, {
    nullable: true,
    description: 'The shared understanding for the Ecoverse',
  })
  @OneToOne(() => Context, { eager: true, cascade: true })
  @JoinColumn()
  context?: Context;

  @OneToOne(
    () => Community,
    community => community.ecoverse,
    { eager: false, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  // The digital identity for the Ecoverse - critical for its trusted role
  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  //
  @OneToMany(
    () => Challenge,
    challenge => challenge.ecoverse,
    { eager: false, cascade: true }
  )
  challenges?: Challenge[];

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the ecoverse',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  // Create the ecoverse with enough defaults set/ members populated
  constructor() {
    super();
    this.name = '';
  }
}
