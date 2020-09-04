import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Agreement, Challenge, Ecoverse, Organisation, Project, User, UserGroup } from '.';

@Entity()
@ObjectType()
export class Tag extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column()
    name: string;

    @ManyToMany(
        () => Challenge,
        challenge => challenge.tags
    )
    challenges?: Challenge;

    @ManyToMany(
        () => Project,
        project => project.tags
    )
    projects?: Project;

    @ManyToMany(
        () => Organisation,
        organisation => organisation.tags
    )
    organisations?: Organisation;

    @ManyToMany(
        () => Ecoverse,
        ecoverse => ecoverse.tags
    )
    ecoverses?: Ecoverse[];

    @ManyToMany(
        () => User,
        user => user.tags
    )
    users?: User;

    @ManyToMany(
        () => UserGroup,
        userGroup => userGroup.tags
    )
    userGroups?: UserGroup;

    @ManyToMany(
        () => Agreement,
        agreement => agreement.tags
    )
    agreements?: Agreement[];

    constructor(name: string) {
        super();
        this.name = name;
    }
}