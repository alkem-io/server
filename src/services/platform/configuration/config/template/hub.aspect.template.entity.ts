import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HubAspectTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'The type of the Aspect',
  })
  type!: string;

  @Field(() => String, {
    nullable: false,
    description: 'A default description for this Aspect.',
  })
  description!: string;
}
