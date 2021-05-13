import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { EcosystemModel, IActorGroup, Actor } from '@domain/context';

export enum RestrictedActorGroupNames {
  Collaborators = 'collaborators',
}

@Entity()
@ObjectType()
export class ActorGroup extends BaseEntity implements IActorGroup {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String, {
    nullable: true,
    description: 'A description of this group of actors',
  })
  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(
    () => EcosystemModel,
    ecosystemModel => ecosystemModel.actorGroups
  )
  ecosystemModel?: EcosystemModel;

  @Field(() => [Actor], {
    nullable: true,
    description: 'The set of actors in this actor group',
  })
  @OneToMany(
    () => Actor,
    actor => actor.actorGroup,
    { eager: true, cascade: true }
  )
  actors?: Actor[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
