import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IGroupable } from '../../interfaces/groupable.interface';
import { Challenge } from '../challenge/challenge.entity';
import { Context } from '../context/context.entity';
import { DID } from '../did/did.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Tagset } from '../tagset/tagset.entity';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { IEcoverse } from './ecoverse.interface';

@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity implements IEcoverse, IGroupable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  // The context and host organisation
  @Field(() => String, { nullable: false, description: '' })
  @Column('varchar', { length: 100 })
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

  // The digital identity for the Ecoverse - critical for its trusted role
  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @Field(() => [UserGroup], {
    nullable: true,
    description: 'The set of groups at the Ecoverse level',
  })
  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.ecoverse,
    { eager: false, cascade: true }
  )
  groups?: UserGroup[];

  @Field(() => [Organisation], {
    nullable: true,
    description:
      'The set of partner organisations associated with this Ecoverse',
  })
  @ManyToMany(
    () => Organisation,
    organisation => organisation.ecoverses,
    { eager: false, cascade: true }
  )
  @JoinTable({
    name: 'ecoverse_partner',
    joinColumns: [{ name: 'ecoverseId', referencedColumnName: 'id' }],
    inverseJoinColumns: [
      { name: 'organisationId', referencedColumnName: 'id' },
    ],
  })
  organisations?: Organisation[];

  //
  @Field(() => [Challenge], {
    nullable: true,
    description: 'The Challenges hosted by the Ecoverse',
  })
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

  // The restricted group names at the ecoverse level
  restrictedGroupNames: string[];

  // Create the ecoverse with enough defaults set/ members populated
  constructor() {
    super();
    this.name = '';
    this.restrictedGroupNames = [
      RestrictedGroupNames.Members,
      RestrictedGroupNames.EcoverseAdmins,
      RestrictedGroupNames.GlobalAdmins,
      RestrictedGroupNames.CommunityAdmins,
    ];
  }
}
