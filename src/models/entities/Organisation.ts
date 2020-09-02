import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { DID, Tag, User, Ecoverse } from '.';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string = '';

  @OneToOne(type => DID)
  @JoinColumn()
  DID!: DID;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.partners
  )
  ecoverse?: Ecoverse;

  @Field(() => [Tag], { nullable: true })
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

  @Field(() => [User])
  @OneToMany(
    type => User,
    user => user.member,
    { eager: true },
  )
  members?: User[];

  // TODO Add relation to challange

  constructor(name: string) {
    super();
    this.name = name;
  }
}