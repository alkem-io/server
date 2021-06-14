import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CreateNVPInput, INVP } from '@domain/common/nvp';
import { Entity } from 'typeorm';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class CreateApplicationInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => UUID, { nullable: false })
  parentID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  questions!: CreateNVPInput[];
}

@ObjectType('Question')
export class IQuestion extends INVP {}

@Entity()
export class Question extends INVP implements IQuestion {}
