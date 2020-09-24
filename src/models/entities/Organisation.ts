import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DID, Ecoverse, Tag, User, UserGroup, RestrictedGroupNames } from '.';
import { Challenge } from './Challenge';
import { IOrganisation } from 'src/interfaces/IOrganisation';
import { IGroupable } from '../interfaces';

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

    @ManyToMany(
        () => Ecoverse,
        ecoverse => ecoverse.partners
    )
    ecoverses?: Ecoverse[];

    @Field(() => [Tag], { nullable: true, description: 'The set of tags applied to this organisation.' })
    @ManyToMany(
        () => Tag,
        tag => tag.ecoverses,
        { eager: true, cascade: true })
    @JoinTable({ name: 'organisation_tag' })
    tags?: Tag[];

    @Field(() => [User], { nullable: true, description: 'The set of users that are associated with this organisation' })
    members?: User[];

    @ManyToMany(
        () => Challenge,
        challenge => challenge.challengeLeads,
    )
    challenges!: Challenge[];

    @Field(() => [UserGroup], { nullable: true, description: 'Groups of users related to a challenge; each group also results in a role that is assigned to users in the group.' })
    @OneToMany(
    () => UserGroup,
    userGroup => userGroup.challenge,
    { eager: true, cascade: true },
  )
    groups?: UserGroup[];

     // The restricted group names at the organisation level
    @Column('simple-array')
    restrictedGroupNames?: string[];

    constructor(name: string) {
        super();
        this.name = name;
        this.restrictedGroupNames = [RestrictedGroupNames.Members];
    }
}