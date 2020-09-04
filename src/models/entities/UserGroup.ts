import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge, Ecoverse, Tag, User } from '.';

@Entity()
@ObjectType()
export class UserGroup extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column()
    name: string;

    @Field(() => [User], { nullable: true, description: 'The set of users that are members of this group' })
    @ManyToMany(
        () => User,
        user => user.userGroup,
        { eager: true, cascade: true }
    )
    @JoinTable()
    members?: User[];

    @Field(() => User, { nullable: true, description: 'The focal point for this group' })
    @OneToOne(() => User)
    @JoinColumn()
    focalPoint?: User;

    @Field(() => [Tag], { nullable: true, description: 'The set of tags for this group e.g. Team, Nature etc.' })
    @ManyToMany(
        () => Tag,
        tag => tag.userGroups,
        { eager: true, cascade: true })
    @JoinTable()
    tags?: Tag[];

    @ManyToOne(
        () => Ecoverse,
        ecoverse => ecoverse.groups
    )
    ecoverse?: Ecoverse;

    @ManyToOne(
        () => Challenge,
        challenge => challenge.groups
    )
    challenge?: Challenge;

    constructor(name: string) {
        super();
        this.name = name;
    }
}