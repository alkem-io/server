import { IUserGroup } from 'src/interfaces/IUserGroup';
import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge, Ecoverse, Tag, User } from '.';

@Entity()
@ObjectType()
export class UserGroup extends BaseEntity implements IUserGroup {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column()
    name: string;

    @Field(() => [User], { nullable: true, description: 'The set of users that are members of this group' })
    @ManyToMany(
        () => User,
        user => user.userGroups,
        { eager: true, cascade: true }
    )
    @JoinTable({ name: 'user_group_members' })
    members?: User[];


    @Field(() => User, { nullable: true, description: 'The focal point for this group' })
    @ManyToOne(
        () => User,
        user => user.focalPoints
        )
    focalPoint?: User;

    @Field(() => [Tag], { nullable: true, description: 'The set of tags for this group e.g. Team, Nature etc.' })
    @ManyToMany(
        () => Tag,
        tag => tag.userGroups,
        { eager: true, cascade: true })
    @JoinTable({ name: 'user_group_tag' })
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