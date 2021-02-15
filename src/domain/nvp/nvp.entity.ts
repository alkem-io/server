import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@ObjectType()
export class NVP extends BaseEntity {
  constructor();
  constructor(name: string);
  constructor(name: string, value: string);
  constructor(name?: string, value?: string) {
    super();
    this.name = name || '';
    this.value = value;
  }

  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name!: string;

  @Field(() => String)
  @Column()
  value?: string;
}
