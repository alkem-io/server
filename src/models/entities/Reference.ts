import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Tag } from '.';
import { Challenge } from './Challenge';
import { Ecoverse } from './Ecoverse';
import { Context } from './Context';

@Entity()
@ObjectType()
export class Reference extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String, { nullable: true, description: "" })
    @Column()
    name?: string = '';

    @Field(() => String, { nullable: true, description: "A one line description" })
    @Column()
    description?: string = '';

    @Field(() => String, { nullable: true, description: "The goal that is being pursued" })
    @Column()
    URI?: string = '';

    @ManyToOne(
        type => Context,
        context => context.references,
    )
    context?: Context;


}