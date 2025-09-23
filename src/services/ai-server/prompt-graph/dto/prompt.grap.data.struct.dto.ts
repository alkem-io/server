import { ObjectType, Field } from '@nestjs/graphql';
import { PromptGraphDataPoint } from './prompt.graph.data.point.dto';

@ObjectType()
export class PromptGrapDataStruct {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => [PromptGraphDataPoint], { nullable: true })
  properties?: PromptGraphDataPoint[];
}
