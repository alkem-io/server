import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AspectTemplate')
export class AspectTemplate {
  @Field(() => String)
  type: string;

  @Field(() => String)
  defaultDescription: string;

  @Field(() => String)
  typeDescription: string;

  constructor(
    type: string,
    defaultDescription?: string,
    typeDescription?: string
  ) {
    this.type = type;
    this.defaultDescription = defaultDescription || '';
    this.typeDescription = typeDescription || '';
  }
}
