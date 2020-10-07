import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Challenge } from 'src/challenge/challenge.entity';
import { DID } from 'src/did/did.entity';
import { Ecoverse } from 'src/ecoverse/ecoverse.entity';
import { IGroupable } from 'src/interfaces/groupable.interface';
import { Tag } from 'src/tag/tag.entity';
import {
  RestrictedGroupNames,
  UserGroup,
} from 'src/user-group/user-group.entity';
import { User } from 'src/user/user.entity';
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
import { IOrganisation } from './organisation.interface';

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
    ecoverse => ecoverse.host,
  )
  hostedEcoverse?: Ecoverse;

  @ManyToMany(
    () => Ecoverse,
    ecoverse => ecoverse.partners,
  )
  ecoverses?: Ecoverse[];

  @Field(() => [Tag], {
    nullable: true,
    description: 'The set of tags applied to this organisation.',
  })
  @ManyToMany(
    () => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true },
  )
  @JoinTable({ name: 'organisation_tag' })
  tags?: Tag[];

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
    { eager: false, cascade: true },
  )
  groups?: UserGroup[];

  @ManyToMany(
    () => Challenge,
    challenge => challenge.challengeLeads,
  )
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
}
