import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { DID, Tag, User, Ecoverse } from '.';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String, {nullable: false, description: ""})
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

  @Field(() => [Tag], {nullable: true, description: "The set of tags applied to this organisation."})
  @OneToMany(
    type => Tag,
    tag => tag.organisation,
    { eager: true },
  )
  tags?: Tag[];

  @Field(() => [User], {nullable: true, description: "The set of users that are associated with this organisation"})
  @OneToMany(
    type => User,
    user => user.member,
    { eager: true },
  )
  members?: User[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}