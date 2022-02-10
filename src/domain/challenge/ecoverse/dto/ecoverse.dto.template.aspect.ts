import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AspectTemplate')
export class AspectTemplate {
  @Field(() => String)
  type: string;

  @Field(() => String)
  description: string;

  constructor(type: string, description?: string) {
    this.type = type;
    this.description = description || '';
  }
}
