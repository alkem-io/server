import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Agreement, Ecoverse, Organisation, Project, UserGroup } from '.';
import { ITag } from 'src/interfaces/ITag';

@Entity()
@ObjectType()
export class Tag extends BaseEntity implements ITag {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @ManyToMany(() => Project, project => project.tags)
  projects?: Project;

  @ManyToMany(() => Organisation, organisation => organisation.tags)
  organisations?: Organisation;

  @ManyToMany(() => Ecoverse, ecoverse => ecoverse.tags)
  ecoverses?: Ecoverse[];

  @ManyToMany(() => UserGroup, userGroup => userGroup.tags)
  userGroups?: UserGroup;

  @ManyToMany(() => Agreement, agreement => agreement.tags)
  agreements?: Agreement[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
