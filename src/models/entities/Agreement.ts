import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project, Tag } from '.';
import { IAgreement } from 'src/interfaces/IAgreement';

@Entity()
@ObjectType()
export class Agreement extends BaseEntity implements IAgreement {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column()
    name: string;

    @Field(() => String)
    @Column()
    description?: string;

    @ManyToOne(
        () => Project,
        project => project.agreements
    )
    project?: Project;

    @Field(() => [Tag], { nullable: true, description: 'The set of tags for this Agreement e.g. Team, Nature etc.' })
    @ManyToMany(
        () => Tag,
        tag => tag.agreements,
        { eager: true, cascade: true })
    @JoinTable({ name: 'agreement_tag' })
    tags?: Tag[];

    constructor(name: string) {
        super();
        this.name = name;
    }

}