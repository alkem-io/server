import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Context } from '.';
import { IReference } from 'src/interfaces/IReference';

@Entity()
@ObjectType()
export class Reference extends BaseEntity implements IReference {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column()
    name: string;

    @Field(() => String)
    @Column()
    uri: string;

    @Field(() => String)
    @Column()
    description: string;

    @ManyToOne(
        () => Context,
        context => context.references
    )
    context?: Context;

    constructor(name: string, uri: string, description: string) {
        super();
        this.name = name;
        this.uri = uri;
        this.description = description;
    }
}