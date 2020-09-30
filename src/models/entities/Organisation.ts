import { IOrganisation } from 'src/interfaces/IOrganisation';
import { Field, ID, ObjectType } from 'type-graphql';
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
import { DID, Ecoverse, RestrictedGroupNames, Tag, User, UserGroup } from '.';
import { IGroupable } from '../interfaces';
import { Challenge } from './Challenge';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity implements IOrganisation, IGroupable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, { nullable: false, description: '' })
  @Column()
  name: string;

  @OneToOne(() => DID)
  @JoinColumn()
  DID!: DID;

  @OneToOne(() => Ecoverse, ecoverse => ecoverse.host)
  hostedEcoverse?: Ecoverse;

  @ManyToMany(() => Ecoverse, ecoverse => ecoverse.partners)
  ecoverses?: Ecoverse[];

  @Field(() => [Tag], { nullable: true, description: 'The set of tags applied to this organisation.' })
  @ManyToMany(() => Tag, tag => tag.ecoverses, { eager: true, cascade: true })
  @JoinTable({ name: 'organisation_tag' })
  tags?: Tag[];

  @Field(() => [User], { nullable: true, description: 'The set of users that are associated with this organisation' })
  members?: User[];

  @Field(() => [UserGroup], { nullable: true, description: 'Groups of users related to an organisation.' })
  @OneToMany(() => UserGroup, userGroup => userGroup.organisation, { eager: false, cascade: true })
  groups?: UserGroup[];

  @ManyToMany(() => Challenge, challenge => challenge.challengeLeads)
  challenges!: Challenge[];

  // The restricted group names at the challenge level
  restrictedGroupNames?: string[];

  constructor(name: string) {
    super();
    this.name = name;
    this.restrictedGroupNames = [RestrictedGroupNames.Members];
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): Organisation {
    if (!this.restrictedGroupNames) {
      this.restrictedGroupNames = [RestrictedGroupNames.Members];
    }

    if (!this.groups) {
      this.groups = [];
      for (const name of this.restrictedGroupNames) {
        const group = new UserGroup(name);
        this.groups.push(group);
      }
    }
    return this;
  }
}
