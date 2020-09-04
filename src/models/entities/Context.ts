import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Reference } from './Reference';

@Entity()
@ObjectType()
export class Context extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String, { nullable: true, description: 'A one line description' })
    @Column()
    description?: string = '';

    @Field(() => String, { nullable: true, description: 'The goal that is being pursued' })
    @Column()
    vision?: string = '';

    @Field(() => [Reference], { nullable: true, description: 'A list of URLs to relevant information.' })
    @OneToMany(
        () => Reference,
        reference => reference.context,
        { eager: true, cascade: true },
    )
    references?: Reference[];

    @Field(() => String, { nullable: true, description: 'The norms for contributors to follow' })
    @Column()
    principles?: string = '';

}