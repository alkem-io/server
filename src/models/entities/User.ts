import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tag, DID, Challenge, UserGroup, Organisation, Ecoverse } from '.';

@Entity()
@ObjectType()
export class User extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

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

  @ManyToOne(
    type => Challenge,
    challenge => challenge.contributors
  )
  challenge?: Challenge;

  @ManyToOne(
    type => UserGroup,
    userGroup => userGroup.members
  )
  userGroup?: UserGroup;

  @ManyToOne(
    type => Organisation,
    organisation => organisation.members
  )
  member?: Organisation;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.members
  )
  ecoverse?: Ecoverse;

  @Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.user,
    { eager: true },
  )
  tags?: Tag[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}