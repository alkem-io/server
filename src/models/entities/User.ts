import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DID, Tag, UserGroup } from '.';

@Entity()
@ObjectType()
export class User extends BaseEntity {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column()
    name: string;

    @Column(() => String)
    account = '';

    @Field(() => String)
    @Column(() => String)
    firstName = '';

    @Field(() => String)
    @Column(() => String)
    lastName = '';

    @Field(() => String)
    @Column(() => String)
    email = '';

    @OneToOne(() => DID)
    @JoinColumn()
    DID!: DID;

    @ManyToMany(
        () => UserGroup,
        userGroup => userGroup.members
    )
    userGroup?: UserGroup;

    @Field(() => [Tag], { nullable: true })
    @ManyToMany(
        () => Tag,
        tag => tag.users,
        { eager: true, cascade: true })
    @JoinTable()
    tags?: Tag[];

    constructor(name: string) {
        super();
        this.name = name;
    }
}