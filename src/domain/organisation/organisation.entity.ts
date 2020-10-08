import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Challenge } from '../challenge/challenge.entity';
import { DID } from '../did/did.entity';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { IGroupable } from '../../interfaces/groupable.interface';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { User } from '../user/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IOrganisation } from './organisation.interface';
import { RestrictedTagsetNames, Tagset } from '../tagset/tagset.entity';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity
  implements IOrganisation, IGroupable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, { nullable: false, description: '' })
  @Column()
  name: string;

  @OneToOne(() => DID)
  @JoinColumn()
  DID!: DID;

  @OneToOne(
    () => Ecoverse,
    ecoverse => ecoverse.host
  )
  hostedEcoverse?: Ecoverse;

  @ManyToMany(
    () => Ecoverse,
    ecoverse => ecoverse.partners
  )
  ecoverses?: Ecoverse[];

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the organisation',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset: Tagset;

  @Field(() => [User], {
    nullable: true,
    description: 'The set of users that are associated with this organisation',
  })
  members?: User[];

  @Field(() => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to an organisation.',
  })
  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.organisation,
    { eager: false, cascade: true }
  )
  groups?: UserGroup[];

  @ManyToMany(
    () => Challenge,
    challenge => challenge.challengeLeads
  )
  challenges!: Challenge[];

  // The restricted group names at the challenge level
  restrictedGroupNames?: string[];

  constructor(name: string) {
    super();
    this.name = name;
    this.tagset = new Tagset(RestrictedTagsetNames.Default);
    // Todo: initialise the tagset

    this.restrictedGroupNames = [RestrictedGroupNames.Members];
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
}
