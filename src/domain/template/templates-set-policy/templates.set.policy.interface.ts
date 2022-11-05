import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('TemplatesSetPolicy')
export abstract class ITemplatesSetPolicy {
  @Field(() => Number)
  minInnovationFlow!: number;
}
