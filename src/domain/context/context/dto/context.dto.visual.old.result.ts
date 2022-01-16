import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Visual')
export abstract class IVisualOld {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  banner!: string;

  @Field(() => String)
  background!: string;

  @Field(() => String)
  avatar!: string;
}
