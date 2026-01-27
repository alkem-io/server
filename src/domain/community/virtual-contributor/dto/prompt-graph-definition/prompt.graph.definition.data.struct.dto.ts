import { Field, ObjectType } from '@nestjs/graphql';
import { PromptGraphDefinitionDataPoint } from './prompt.graph.definition.data.point.dto';

@ObjectType()
export class PromptGraphDefinitionDataStruct {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => [PromptGraphDefinitionDataPoint], { nullable: true })
  properties?: PromptGraphDefinitionDataPoint[];
}
