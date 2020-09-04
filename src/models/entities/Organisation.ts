import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DID, Ecoverse, Tag, User } from '.';
import { Challenge } from './Challenge';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String, { nullable: false, description: '' })
    @Column()
    name: string;

    @OneToOne(() => DID)
    @JoinColumn()
    DID!: DID;

    @ManyToOne(
        () => Ecoverse,
        ecoverse => ecoverse.partners
    )
    ecoverse?: Ecoverse;

    @Field(() => [Tag], { nullable: true, description: 'The set of tags applied to this organisation.' })
    @ManyToMany(
        () => Tag,
        tag => tag.ecoverses,
        { eager: true, cascade: true })
    @JoinTable()
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