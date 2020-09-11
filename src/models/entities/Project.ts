import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Agreement, Challenge, Tag } from '.';
import { IProject } from 'src/interfaces/IProject';

@Entity()
@ObjectType()
export class Project extends BaseEntity implements IProject {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String, { nullable: false, description: '' })
    @Column()
    name: string;

    @Field(() => String, { nullable: true, description: '' })
    @Column(() => String)
    description = '';

    @Field(() => String, { nullable: true, description: 'The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc' })
    @Column(() => String)
    lifecyclePhase = '';

    @Field(() => [Tag], { nullable: true, description: 'The set of tags for this Project' })
    @ManyToMany(
        () => Tag,
        tag => tag.ecoverses,
        { eager: true, cascade: true })
    @JoinTable()
    tags?: Tag[];

    //@Field(() => [Agreement])
    @OneToMany(
        () => Agreement,
        agreement => agreement.project,
        { eager: true },
    )
    agreements?: Agreement[];


    @ManyToOne(
        () => Challenge,
        challenge => challenge.projects
    )
    challenge?: Challenge;

    constructor(name: string) {
        super();
        this.name = name;
    }

}