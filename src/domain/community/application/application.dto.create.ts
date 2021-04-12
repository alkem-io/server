import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { CreateNVPInput } from '@domain/common/nvp';

@InputType()
export class CreateApplicationInput {
  @Field()
  userId!: number;

  @Field()
  parentID!: number;

  @Field(() => [CreateNVPInput])
  questions!: CreateNVPInput[];
}

@ObjectType()
export class Question extends NVP {}
