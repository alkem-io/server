import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, OneToOne, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project, Tagset, RestrictedTagsetNames } from '.';
import { IAgreement } from 'src/interfaces/IAgreement';
import { ITaggable } from '../interfaces';

@Entity()
@ObjectType()
export class Agreement extends BaseEntity implements IAgreement, ITaggable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String)
  @Column()
  description?: string;

  @ManyToOne(() => Project, project => project.agreements)
  project?: Project;

  @Field(() => Tagset, { nullable: true, description: 'The set of tags for the project' })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset: Tagset;

  constructor(name: string) {
    super();
    this.name = name;
    this.tagset = new Tagset(RestrictedTagsetNames.Default);
    this.tagset.initialiseMembers();
  }
}
