import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CreateNVPInput, INVP } from '@domain/common/nvp';
import { Entity } from 'typeorm';

@InputType()
export class CreateApplicationInput {
  @Field({ nullable: false })
  userId!: number;

  @Field({ nullable: false })
  parentID!: number;

  @Field(() => [CreateNVPInput], { nullable: false })
  questions!: CreateNVPInput[];
}

@ObjectType('Question')
export class IQuestion extends INVP {}

@Entity()
export class Question extends INVP implements IQuestion {}
