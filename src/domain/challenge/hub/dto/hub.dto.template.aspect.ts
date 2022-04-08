import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AspectTemplate')
export class AspectTemplate {
  @Field(() => String, {
    description: 'The type of the templated aspect',
  })
  type: string;

  @Field(() => String, {
    description: 'Default description of an aspect of this type',
  })
  defaultDescription: string;

  @Field(() => String, {
    description: 'Default description of this type of aspect',
  })
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
