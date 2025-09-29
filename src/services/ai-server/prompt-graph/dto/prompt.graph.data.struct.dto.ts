import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { PromptGraphDataPoint } from './prompt.graph.data.point.dto';

@InputType('PromptGraphDataStructInput')
@ObjectType()
export class PromptGraphDataStruct {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => [PromptGraphDataPoint], { nullable: true })
  properties?: PromptGraphDataPoint[];
}
