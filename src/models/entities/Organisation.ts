import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DID, Ecoverse, Tag, User } from '.';
import { Challenge } from './Challenge';
import { IOrganisation } from 'src/interfaces/IOrganisation';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity implements IOrganisation {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String, { nullable: false, description: '' })
    @Column()
    name: string;

    @OneToOne(() => DID)
    @JoinColumn()
    DID!: DID;

    @OneToOne(() => Ecoverse, ecoverse => ecoverse.ecoverseHost)
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

    constructor(name: string) {
        super();
        this.name = name;
    }
}