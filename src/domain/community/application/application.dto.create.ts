import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { CreateNVPInput } from '@domain/common/nvp';

@InputType()
export class CreateApplicationInput {
  @Field({ nullable: false })
  userId!: number;

  @Field({ nullable: false })
  parentID!: number;

  @Field(() => [CreateNVPInput], { nullable: false })
  questions!: CreateNVPInput[];
}

@ObjectType()
export class Question extends NVP {}
