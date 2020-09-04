import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Tag, DID, Challenge, UserGroup, Organisation, Ecoverse } from '.';

@Entity()
@ObjectType()
export class User extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string = '';

  @Column()
  account: string = '';

  @Field(() => String)
  @Column()
  firstName: string = '';

  @Field(() => String)
  @Column()
  lastName: string = '';

  @Field(() => String)
  @Column()
  email: string = '';

  @OneToOne(type => DID)
  @JoinColumn()
  DID!: DID;

  @ManyToMany(
    type => UserGroup,
    userGroup => userGroup.members
  )
  userGroup?: UserGroup;

  @Field(() => [Tag], { nullable: true })
  @ManyToMany(
    type => Tag,
    tag => tag.users,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}