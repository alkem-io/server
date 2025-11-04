import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { PromptGraphDataStruct } from './prompt.graph.data.struct.dto';

@InputType('PromptGraphDataPointInput')
@ObjectType()
export class PromptGraphDataPoint {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  optional?: boolean;

  @Field(() => PromptGraphDataStruct, { nullable: true })
  items?: PromptGraphDataStruct;
}
